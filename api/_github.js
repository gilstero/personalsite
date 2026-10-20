const GITHUB_API = "https://api.github.com";

function getGitHubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY || "gilstero/personalsite";
  const branch = process.env.GITHUB_BRANCH || "main";
  const [owner, name, ...extra] = repository.split("/");

  if (!token) {
    throw new Error("GITHUB_TOKEN is not configured.");
  }
  if (!owner || !name || extra.length) {
    throw new Error("GITHUB_REPOSITORY must be in owner/repository format.");
  }

  return { token, owner, repository: name, branch };
}

async function githubRequest(config, path, options = {}) {
  const { allowNotFound, ...requestOptions } = options;
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...requestOptions,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "personalsite-content-publisher",
      ...(requestOptions.headers || {})
    }
  });
  const responseText = await response.text();
  let data = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error(`GitHub returned an unreadable response (${response.status}).`);
    }
  }
  if (!response.ok) {
    if (response.status === 404 && allowNotFound) {
      return null;
    }
    const requestError = new Error(
      `GitHub API request failed (${response.status}): ${data.message || "Unknown error."}`
    );
    requestError.status = response.status;
    throw requestError;
  }
  return data;
}

async function readRepositoryJson(config, path, branch, defaultValue) {
  const response = await githubRequest(
    config,
    `/repos/${config.owner}/${config.repository}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    { allowNotFound: true }
  );

  if (!response) {
    return defaultValue;
  }
  if (response.encoding !== "base64" || typeof response.content !== "string") {
    throw new Error(`The existing ${path} file is not a readable GitHub file.`);
  }

  return JSON.parse(Buffer.from(response.content, "base64").toString("utf8"));
}

async function createBlob(config, content, encoding = "utf-8") {
  const data = await githubRequest(
    config,
    `/repos/${config.owner}/${config.repository}/git/blobs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: encoding === "base64" ? content.toString("base64") : content,
        encoding
      })
    }
  );
  return data.sha;
}

async function commitFiles(config, branch, files, commitMessage) {
  const branchPath = branch.split("/").map(encodeURIComponent).join("/");
  const ref = await githubRequest(
    config,
    `/repos/${config.owner}/${config.repository}/git/ref/heads/${branchPath}`
  );
  const parentSha = ref.object.sha;
  const parentCommit = await githubRequest(
    config,
    `/repos/${config.owner}/${config.repository}/git/commits/${parentSha}`
  );
  const treeEntries = await Promise.all(files.map(async (file) => ({
    path: file.path,
    mode: "100644",
    type: "blob",
    sha: await createBlob(config, file.content, file.encoding || "utf-8")
  })));
  const tree = await githubRequest(
    config,
    `/repos/${config.owner}/${config.repository}/git/trees`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_tree: parentCommit.tree.sha, tree: treeEntries })
    }
  );
  const commit = await githubRequest(
    config,
    `/repos/${config.owner}/${config.repository}/git/commits`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: commitMessage,
        tree: tree.sha,
        parents: [parentSha]
      })
    }
  );
  await githubRequest(
    config,
    `/repos/${config.owner}/${config.repository}/git/refs/heads/${branchPath}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sha: commit.sha, force: false })
    }
  );
}

module.exports = {
  commitFiles,
  getGitHubConfig,
  githubRequest,
  readRepositoryJson
};
