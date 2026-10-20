const crypto = require("crypto");
const { isAuthenticated } = require("./_auth");
const { commitFiles, getGitHubConfig, readRepositoryJson } = require("./_github");

const TICKETS_PATH = "assets/kanban/tickets.json";
const TICKET_STATUSES = new Set(["todo", "in-progress", "review", "complete"]);
const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 5000;

function validTickets(tickets) {
  return Array.isArray(tickets) && tickets.every((ticket) =>
    ticket &&
    typeof ticket.id === "string" &&
    typeof ticket.title === "string" &&
    typeof ticket.description === "string" &&
    TICKET_STATUSES.has(ticket.status) &&
    typeof ticket.createdAt === "string"
  );
}

function sendError(res, status, error) {
  console.error("Kanban request failed:", error.message);
  res.status(status).json({ error });
}

module.exports = async (req, res) => {
  if (!["GET", "POST", "PATCH", "DELETE"].includes(req.method)) {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }
  if (req.method !== "GET" && !isAuthenticated(req)) {
    res.status(401).json({ error: "Please log in to access the Kanban board." });
    return;
  }

  try {
    const config = getGitHubConfig();
    const tickets = await readRepositoryJson(config, TICKETS_PATH, config.branch, []);
    if (!validTickets(tickets)) {
      throw new Error("The Kanban ticket file has an invalid format.");
    }

    if (req.method === "GET") {
      res.status(200).json({ tickets });
      return;
    }

    const body = req.body || {};
    let nextTickets;
    let commitMessage;

    if (req.method === "POST") {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      if (!title || title.length > MAX_TITLE_LENGTH) {
        res.status(400).json({ error: `Ticket title must be 1 to ${MAX_TITLE_LENGTH} characters.` });
        return;
      }
      if (!description || description.length > MAX_DESCRIPTION_LENGTH) {
        res.status(400).json({ error: `Ticket description must be 1 to ${MAX_DESCRIPTION_LENGTH} characters.` });
        return;
      }

      const ticket = {
        id: crypto.randomUUID(),
        title,
        description,
        status: "todo",
        createdAt: new Date().toISOString()
      };
      nextTickets = [...tickets, ticket];
      commitMessage = `Add Kanban ticket: ${title}`;
    } else {
      const ticketIndex = tickets.findIndex((ticket) => ticket.id === body.id);
      if (ticketIndex === -1) {
        res.status(404).json({ error: "Ticket not found." });
        return;
      }

      nextTickets = [...tickets];
      if (req.method === "PATCH") {
        if (!TICKET_STATUSES.has(body.status)) {
          res.status(400).json({ error: "Choose a valid ticket status." });
          return;
        }
        nextTickets[ticketIndex] = { ...nextTickets[ticketIndex], status: body.status };
        commitMessage = `Move Kanban ticket: ${nextTickets[ticketIndex].title}`;
      } else {
        const [deletedTicket] = nextTickets.splice(ticketIndex, 1);
        commitMessage = `Delete Kanban ticket: ${deletedTicket.title}`;
      }
    }

    await commitFiles(
      config,
      config.branch,
      [{ path: TICKETS_PATH, content: `${JSON.stringify(nextTickets, null, 2)}\n` }],
      commitMessage
    );
    res.status(200).json({ tickets: nextTickets });
  } catch (error) {
    const status = error.status === 422 ? 409 : 500;
    sendError(
      res,
      status,
      status === 409
        ? "The board changed at the same time. Refresh and try again."
        : "Could not access or save the Kanban board. Check the server configuration and logs."
    );
  }
};
