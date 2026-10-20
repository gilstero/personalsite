const crypto = require("crypto");
const mammoth = require("mammoth");
const { htmlToText } = require("html-to-text");
const profanityFilter = require("leo-profanity");
const { isAuthenticated } = require("./_auth");
const { commitFiles, getGitHubConfig, readRepositoryJson } = require("./_github");

const MAX_DOCX_SIZE = 4 * 1024 * 1024;
const MAX_IMAGE_COUNT = 25;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_ARTICLE_TEXT_BYTES = 1024 * 1024;
class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function readUpload(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let exceededLimit = false;

    req.on("data", (chunk) => {
      if (exceededLimit) {
        return;
      }
      size += chunk.length;
      if (size > MAX_DOCX_SIZE) {
        exceededLimit = true;
        reject(new RequestError(413, "The DOCX exceeds the 4 MB upload limit."));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!exceededLimit) {
        resolve(Buffer.concat(chunks));
      }
    });
    req.on("error", reject);
  });
}

function normalizeImageType(mimeType) {
  const extensions = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp"
  };
  return extensions[mimeType.toLowerCase()];
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "article";
}

function convertDocument(html, slug) {
  const images = [];
  let totalImageBytes = 0;
  const htmlWithMarkers = html.replace(/<img\b[^>]*>/gi, (imageTag) => {
    const sourceMatch = imageTag.match(/\bsrc=(["'])(.*?)\1/i);
    const dataMatch = sourceMatch && sourceMatch[2].match(
      /^data:(image\/(?:png|jpeg|jpg|gif|webp));base64,([A-Za-z0-9+/=]+)$/i
    );

    if (!dataMatch) {
      throw new RequestError(400, "An embedded image could not be extracted from this DOCX.");
    }
    if (images.length >= MAX_IMAGE_COUNT) {
      throw new RequestError(400, "A DOCX can contain at most 25 embedded images.");
    }

    const mimeType = dataMatch[1].toLowerCase();
    const extension = normalizeImageType(mimeType);
    const content = Buffer.from(dataMatch[2], "base64");
    totalImageBytes += content.length;
    if (totalImageBytes > MAX_IMAGE_BYTES) {
      throw new RequestError(413, "Extracted article images exceed the 5 MB limit.");
    }

    const imageIndex = images.length;
    const path = `assets/articles/${slug}/image-${String(imageIndex + 1).padStart(2, "0")}.${extension}`;
    const altMatch = imageTag.match(/\balt=(["'])(.*?)\1/i);
    const alt = altMatch
      ? htmlToText(`<span>${altMatch[2]}</span>`, { wordwrap: false }).trim()
      : `Article image ${imageIndex + 1}`;
    images.push({ path, alt, content });
    return ` [[ARTICLE_IMAGE_${imageIndex}]] `;
  });

  const text = htmlToText(htmlWithMarkers, {
    wordwrap: false,
    preserveNewlines: true
  }).trim();

  if (!text && images.length === 0) {
    throw new RequestError(400, "This DOCX does not contain readable text or images.");
  }
  if (Buffer.byteLength(text, "utf8") > MAX_ARTICLE_TEXT_BYTES) {
    throw new RequestError(413, "The converted article text exceeds the 1 MB limit.");
  }

  return { text, images };
}

async function getArticleIndex(config, branch) {
  const articles = await readRepositoryJson(config, "assets/articles/index.json", branch, []);
  if (!Array.isArray(articles)) {
    throw new Error("The existing article index does not contain an array.");
  }
  return articles;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Please log in before publishing an article." });
    return;
  }

  try {
    const title = new URL(req.url, "http://localhost").searchParams.get("title")?.trim();
    if (!title || title.length > 160) {
      throw new RequestError(400, "Enter an article title of 1 to 160 characters.");
    }

    const buffer = await readUpload(req);
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      throw new RequestError(400, "The uploaded file is not a valid DOCX document.");
    }

    let conversion;
    try {
      conversion = await mammoth.convertToHtml({ buffer });
    } catch (error) {
      throw new RequestError(400, "Could not read the uploaded DOCX document.");
    }
    const uploadedAt = new Date().toISOString();
    const slug = `${slugify(title)}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
    const converted = convertDocument(conversion.value, slug);
    const textToCheck = [
      title,
      converted.text,
      ...converted.images.map((image) => image.alt)
    ].join("\n");
    if (profanityFilter.check(textToCheck)) {
      throw new RequestError(
        422,
        "This document contains language blocked by the upload filter. Please revise it and try again."
      );
    }

    const article = {
      title,
      uploadedAt,
      file: `assets/articles/${slug}.txt`,
      images: converted.images.map(({ path, alt }) => ({ path, alt }))
    };
    let config;
    try {
      config = getGitHubConfig();
    } catch (error) {
      throw new RequestError(500, error.message);
    }
    const articles = await getArticleIndex(config, config.branch);
    articles.push(article);

    const files = [
      {
        path: article.file,
        content: converted.text
      },
      ...converted.images.map((image) => ({
        path: image.path,
        content: image.content,
        encoding: "base64"
      })),
      {
        path: "assets/articles/index.json",
        content: JSON.stringify(articles, null, 2) + "\n"
      }
    ];

    await commitFiles(config, config.branch, files, `Publish article: ${title}`);
    res.status(201).json({
      ok: true,
      warnings: conversion.messages.length,
      article
    });
  } catch (error) {
    console.error("Article publishing failed:", error.message);
    const status = error instanceof RequestError ? error.status : 500;
    const message = error instanceof RequestError
      ? error.message
      : "Article publishing failed. Check the Vercel function logs and GitHub configuration.";
    res.status(status).json({ error: message });
  }
};

module.exports.config = {
  api: {
    bodyParser: false
  }
};
