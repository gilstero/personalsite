### Olin's Personal Site

This repository contains my personal website and a few small interactive pages
that I use to share what I am building and learning.

The site currently includes:

- Main: a short introduction and personal homepage
- Experience: work, research, and community involvement
- Projects: games, experiments, and technical builds
- Posts: DOCX article publishing and a public article reader
- Kanban: a public ticket board that only the site owner can edit

The Kanban board uses the existing admin password for ticket creation, status
changes, and deletion. Tickets are stored in `assets/kanban/tickets.json` and
persist through commits to the configured GitHub branch.

Vercel Web Analytics is included on the site's HTML pages. Enable it for this
project from **Analytics** in the Vercel dashboard, then deploy the site to
start collecting page views.
