### Olin's Personal Site

This repository contains my personal website and a few small interactive pages
that I use to share what I am building and learning.

The site currently includes:

- Main: a short introduction and personal homepage
- Experience: work, research, and community involvement
- Projects: games, experiments, and technical builds
- Posts: DOCX article publishing and a public article reader

The goal of the site is to stay simple, personal, and easy to keep updating.

### Publishing posts

The `/posts/` page accepts `.docx` uploads by drag-and-drop or file selection.
Apple Pages and Google Docs files should be exported as DOCX first. After
password authentication, enter the article title. The site converts the
document to plain text, extracts embedded PNG, JPEG, GIF, and WebP images, and
checks the title, converted text, and image alt text against the English
dictionary from `leo-profanity` before committing. If a match is found, the API
rejects the upload and does not write any article files to GitHub. Text inside
images is not OCR-scanned. The dictionary is not exhaustive and may miss terms
or flag words without harmful context, so review flagged documents and don't
treat this check as a guarantee. Accepted uploads commit the text, images, and
article listing to this repository. Vercel should deploy the new post from
that commit.

Configure these Vercel environment variables for the API:

- `BLOG_ADMIN_PASSWORD`: a unique, randomly generated password used only for
  article publishing (use at least 20 characters)
- `BLOG_SESSION_SECRET`: a separate random secret used to sign admin sessions.
  Generate one with `openssl rand -hex 32`.
- `GITHUB_TOKEN`: a fine-grained GitHub token with Contents read/write access
  for this repository
- `GITHUB_REPOSITORY`: `gilstero/personalsite` (optional; this is the default)
- `GITHUB_BRANCH`: `main` (optional; this is the default)

Keep the GitHub token in Vercel or a local ignored `.env.local` file; never put
it in browser code or commit it. Set the password and session secret in
Vercel's Environment Variables settings, not in source files, and enable them
only for the environments that need publishing. Never reuse your GitHub,
email, or other account password for `BLOG_ADMIN_PASSWORD`. The publisher limits DOCX files to 4 MB,
extracted images to 5 MB total, and article text to 1 MB.

### Testing article uploads

For a safe end-to-end test, create a temporary branch such as `posts-test` and
use a GitHub token restricted to this repository. Configure Vercel Preview
environment variables with `GITHUB_BRANCH=posts-test`, then deploy a preview
from that branch. Upload a small DOCX containing a heading, a few paragraphs,
and an embedded image. Verify that:

1. The page asks for the admin password and article title.
2. A commit on `posts-test` contains `assets/articles/index.json`, a `.txt`
   article, and the extracted image.
3. After the preview redeploys, the article appears with its title and upload
   date, and opens with the image displayed inline.
4. An incorrect password and a non-DOCX file are rejected.

To test locally with the Vercel CLI, put the same variables in `.env.local`,
set `GITHUB_BRANCH=posts-test`, install dependencies with `npm install`, then
run `npx vercel dev`. Do not point a local test at `main` unless you intend
uploads to commit directly to the production branch.
