import { CHAT_LAUNCHED } from "@/features/chat/launch";

import type { GuideTopic } from "./guide-content";

export const GUIDE_TOPICS_EN: GuideTopic[] = [
  {
    id: "start",
    title: "Getting started",
    summary: "From a new project to your first chapter",
    lead: "A project is a workspace that keeps your story's chapters, settings, characters and notes in one place.",
    updatedAt: "2026-08-30",
    readMinutes: 2,
    facts: [
      { label: "Start from", value: "Projects" },
      { label: "You need", value: "A project title" },
      { label: "Saving", value: "Automatic" },
    ],
    sections: [
      {
        id: "choose",
        title: "Choose New project",
        body: "Start a new story from the first card in your project list.",
      },
      {
        id: "name",
        title: "Name the project",
        body: "Enter a name that makes the project easy to recognize, then create it.",
      },
      {
        id: "write",
        title: "Write your first chapter",
        body: "Create a chapter in the workspace and check that it saves automatically.",
      },
    ],
    related: ["files", "writing"],
  },
  {
    id: "files",
    title: "Files and setting documents",
    summary: "Organize and link your material",
    lead: "Documents such as settings, worldbuilding and places are made up of a title, custom properties and content.",
    updatedAt: "2026-08-30",
    readMinutes: 2,
    facts: [
      { label: "Document type", value: "Setting document" },
      { label: "Created in", value: "Files in the sidebar" },
      { label: "Saving", value: "Automatic" },
    ],
    sections: [
      {
        id: "create",
        title: "Create a file",
        body: "Use the More actions button next to Files in the sidebar to create the file you need.",
      },
      {
        id: "property",
        title: "Add a property",
        body: "Select Add property, then choose text or a link to another file.",
      },
      {
        id: "link",
        title: "Link files",
        body: "You can link any files in the project to each other, including chapters, settings, worldbuilding and places.",
      },
      {
        id: "status",
        title: "Check the save status",
        body: "The status at the top shows whether your edits are saving, saved or hit an error.",
      },
    ],
    related: ["writing", "explore"],
  },
  {
    id: "writing",
    title: "Writing chapters",
    summary: "Write without distractions and keep an eye on saving",
    lead: "A chapter has a title and a formatted body. It saves automatically, so there is no save button.",
    updatedAt: "2026-10-13",
    readMinutes: 3,
    facts: [
      { label: "Document type", value: "Manuscript" },
      { label: "Created in", value: "Manuscripts folder and episodes" },
      { label: "Saving", value: "Automatic · Version history" },
    ],
    sections: [
      {
        id: "episode",
        title: "Create an episode",
        body: "Create an episode in the Manuscripts folder and keep its chapters inside it.",
      },
      {
        id: "import",
        title: "Bring in what you've already written",
        body: "Choose Import in the sidebar or on a new tab, add text (.txt) or Markdown (.md) files, check the list and press Import. They are created as chapters in the Manuscripts folder. Each file name becomes the title, and nothing is created until you press Import.",
      },
      {
        id: "format",
        title: "Format your text",
        body: "Use the toolbar to apply bold, italic, lists and indentation.",
      },
      {
        id: "find",
        title: "Find and replace",
        body: "Use Find and replace to fix a repeated phrase everywhere at once.",
      },
      {
        id: "version",
        title: "Go back to an earlier version",
        body: "In Version history, compare an earlier version with the current document and restore it.",
      },
    ],
    related: ["files", "memo"],
  },
  {
    id: "explore",
    title: "Search and graph",
    summary: "Find your way around the whole project",
    lead: "Search looks through titles and text. The graph shows the relationships you have set between documents.",
    updatedAt: "2026-08-30",
    readMinutes: 2,
    facts: [
      {
        label: "Searches",
        value: "Chapters and setting documents not in the trash",
      },
      { label: "Graph source", value: "Relationships in the property table" },
      { label: "Restored", value: "View, filters and selected node" },
    ],
    sections: [
      {
        id: "search",
        title: "Search documents",
        body: "Search in the sidebar looks through titles and text together.",
      },
      {
        id: "graph",
        title: "Explore the graph",
        body: "Select a node to highlight the documents linked directly to it. Select more nodes to highlight their links together, and click the empty canvas to clear the selection. The text on a line is the note you wrote for that relationship in the property table.",
      },
      {
        id: "filter",
        title: "Filters and episodes",
        body: "Use the category filter and the episode range to show only the relationships you want to see.",
      },
    ],
    related: ["files", "memo"],
  },
  {
    id: "memo",
    title: "Notes and timeline",
    summary: "Keep track of ideas and the order of events",
    lead: "Leave notes on the whole project or on a single file. The timeline shows at a glance which chapters each document appears in.",
    updatedAt: "2026-08-30",
    readMinutes: 2,
    facts: [
      { label: "Notes on", value: "Project · File" },
      { label: "Timeline", value: "Documents × chapters" },
      { label: "Saving", value: "Automatic" },
    ],
    sections: [
      {
        id: "project-memo",
        title: "Project notes",
        body: "Open Notes in the sidebar to keep as many notes about the whole project as you like.",
      },
      {
        id: "file-memo",
        title: "File notes",
        body: "Use the Notes button at the top of a file to open a notes panel beside or below the document.",
      },
      {
        id: "timeline",
        title: "Read the timeline",
        body: "Rows are setting documents and columns are chapters. An unbroken bar marks the chapters a document appears in.",
      },
    ],
    related: ["writing", "explore"],
  },
  {
    id: "chat",
    title: "AI chat",
    summary: "Ask about your story and see where each answer comes from",
    lead: "AI chat reads your chapters, setting documents, the relationships between them and your notes all at once, then answers your question. It only answers and never edits your manuscript.",
    updatedAt: "2026-10-14",
    readMinutes: 3,
    soon: !CHAT_LAUNCHED,
    facts: [
      { label: "Open from", value: "Button at the bottom right" },
      {
        label: "Reads",
        value: "Chapters · Settings · Relationships · Notes",
      },
      { label: "Conversations", value: "Kept per project" },
    ],
    sections: [
      {
        id: "open",
        title: "Open the chat",
        body: "Press the round button at the bottom right of the workspace to open the chat window. You can keep writing while it's open. Drag its left or top edge, or its top-left corner, to resize it, and double-click an edge to go back to the default size. This browser remembers the size you choose.",
      },
      {
        id: "ask",
        title: "Ask a question",
        body: "Type a question on the first screen, or pick a suggested one, to start a new conversation. The document you're viewing is shared too; click its chip in the question box to leave it out. The answer appears once the whole story has been read, and while you wait you can see what it's doing and how long it has taken.",
      },
      {
        id: "selection",
        title: "Ask about a passage",
        body: "Select a passage in a document's text and a small bar appears. Choose Ask AI to add the passage to the question box as a quote, or choose Explain, Related settings or Before and after to ask right away. If a conversation is open in the chat window, the question goes there. Otherwise a new conversation starts.",
      },
      {
        id: "answer",
        title: "Read answers and sources",
        body: "Each source appears as a chip with the document's name, colored by document type. Notes are your working notes, so they're kept apart from chapter and setting sources as gray note chips. Hover over a chip to see the quoted text, and click it to open the document or your notes. Use the copy button under an answer to copy it.",
      },
      {
        id: "stop",
        title: "Stop and ask again",
        body: "While an answer is being written, press the stop button in the question box. Unfinished answers aren't kept, and Ask again sends the same question once more. Hover over your last question and click the pencil to edit it and get a new answer.",
      },
      {
        id: "sessions",
        title: "Search and manage conversations",
        body: "Search conversations on the first screen to look through their titles and what was said. Matches are highlighted, and Enter opens the first result. Use the ⋯ menu at the top of a conversation to rename or delete it. A deleted conversation can't be restored.",
      },
      {
        id: "too-long",
        title: "When a story is too long",
        body: "If your chapters, settings and notes together are more than AI chat can read at once, the chat button turns gray. Click it to see how long the story is and what the limit is.",
      },
    ],
    related: ["writing", "memo"],
  },
  {
    id: "trash",
    title: "Trash and restore",
    summary: "Bring back deleted items safely",
    lead: "Deleted files and projects stay in the trash. From there you can restore them, or delete them permanently after confirming.",
    updatedAt: "2026-08-30",
    readMinutes: 1,
    facts: [
      { label: "Kept in", value: "Each project's trash" },
      { label: "Restored to", value: "Original location" },
      { label: "Deleting", value: "Only after you confirm" },
    ],
    sections: [
      {
        id: "move",
        title: "Move to trash",
        body: "Choose Move to trash from a file's menu or a project card's menu.",
      },
      {
        id: "restore",
        title: "Restore an item",
        body: "If its original location no longer exists, the item returns to the top level of Files.",
      },
      {
        id: "delete",
        title: "Delete permanently",
        body: "Items you delete permanently can't be restored.",
      },
    ],
    related: ["files", "start"],
  },
];
