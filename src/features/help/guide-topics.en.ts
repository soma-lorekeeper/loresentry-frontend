import type { GuideTopic } from "./guide-content";

export const GUIDE_TOPICS_EN: GuideTopic[] = [
  {
    id: "start",
    title: "Getting started",
    summary: "From a new project to your first chapter",
    lead: "A project is a workspace that keeps one story's chapters, setting documents, notes and the relationships between them in one place. Creating a project opens its workspace right away, and everything you write saves automatically.",
    updatedAt: "2026-10-22",
    readMinutes: 3,
    facts: [
      { label: "Start from", value: "Projects" },
      { label: "You need", value: "A project title" },
      { label: "Saving", value: "Automatic" },
    ],
    sections: [
      {
        id: "create",
        title: "Create a project",
        body: "Select New project at the top right of your project list. If you have no projects yet, select Create your first project in the middle of the page.\n\n- The project title is required and can be up to 255 characters.\n- The description is optional and can be up to 500 characters.\n- Select Create project and the new workspace opens right away.",
      },
      {
        id: "manage",
        title: "Work with project cards",
        body: "Select a card to open its workspace. Each card shows the description, the file you last worked on and when you last worked on it.\n\nOpen a card's more menu (⋯) and choose Edit to change its name and description, or Move to trash to move the project to the trash. A project in the trash keeps its files and settings and can be restored.",
      },
      {
        id: "layout",
        title: "Find your way around",
        body: "The sidebar on the left holds, from top to bottom:\n\n- The account menu and project switcher: jump to another project or back to your project list.\n- Search · Graph · Timeline · Notes: views across the whole project.\n- Graph refresh: finds new details and relationships in your chapters and proposes them.\n- Favorites: the documents you open most.\n- Files: chapters and setting documents, grouped in category folders.\n- Import · Trash · Settings · Help\n\nSelect Tour the workspace in Help to see the guided tour of the screen again.",
      },
      {
        id: "write",
        title: "Write your first chapter",
        body: "In the Files area, open the more menu (⋯) of the Manuscript folder and choose Add manuscript. Type a name and press Enter; the chapter is created and opens. You can also select Manuscript under Create new on a new tab.\n\nYour text saves 0.8 seconds after you stop typing, and at least every 5 seconds while you keep going. When the status at the right of the toolbar reads Saved, it is saved. Press ⌘S (Ctrl+S on Windows) to save right away.",
      },
      {
        id: "replay",
        title: "Replay the intro",
        body: "Open Guide on the left of your project list and select Replay the intro at the top to see the introduction you saw when you signed up. On its last step you can also create the sample project ‘The Glass Garden Records’ and try things out.",
      },
    ],
    related: ["workspace", "files", "writing"],
  },
  {
    id: "workspace",
    title: "Tabs and split view",
    summary: "Open documents side by side and use shortcuts",
    lead: "In the workspace, documents and views open in tabs. Split the window in two to keep a chapter and a setting document side by side. Your tabs and layout are saved per project and come back when you reopen it.",
    updatedAt: "2026-10-22",
    readMinutes: 3,
    facts: [
      { label: "Panes", value: "Up to 2" },
      { label: "Layout", value: "Saved per project" },
      { label: "All shortcuts", value: "Help → Keyboard shortcuts" },
    ],
    sections: [
      {
        id: "tabs",
        title: "Work with tabs",
        body: "- Select + at the end of the tab bar to open a new tab. A new tab offers Continue working, Create new and Recently opened.\n- A document opens in only one tab per pane. If it is already open, you go to that tab.\n- Drag tabs to reorder them, and close one with × or the middle mouse button. Closing the last tab leaves a new tab.\n- The button at the left end of the tab bar hides and shows the sidebar.",
      },
      {
        id: "split",
        title: "Split the window",
        body: "Drag a document, or the Search, Graph, Timeline or Notes button, from the sidebar to an edge of the work area and a second pane opens on that side. You can also drag a tab onto the other pane's tab bar to move it there. If your writing hasn't saved yet, it saves before the tab moves.\n\nDrag the handle between the panes to resize them. When the window is 900px wide or less, only one pane shows and the sidebar opens as a drawer.",
      },
      {
        id: "keyboard",
        title: "Keyboard shortcuts",
        body: "- ⌘S: Save now\n- ⌘F: Find and replace in the document\n- ⌘⇧F: Search the project\n- ⌘P: Export as PDF\n- ⌘\\: Show or hide the sidebar\n- ⌥T: New tab, ⌥W: Close tab\n- ⌃⇧] / ⌃⇧[: Next tab / previous tab\n- ⌥M: Move a tab or split the window. Pick a spot with the arrow keys, press Enter to confirm or Esc to cancel.\n- ⌥P: Go to the other pane\n\nOn Windows, use Ctrl for ⌘ and ⌃, and Alt for ⌥. The full list is under Keyboard shortcuts in Help.",
      },
      {
        id: "restore",
        title: "How your layout comes back",
        body: "Open tabs, split panes, whether the sidebar and notes panel are open, and the graph's category filter and episode choice are saved per project whenever they change. Opening the same project on another device starts with the same layout. The sidebar width is remembered only in this browser.",
      },
    ],
    related: ["start", "explore"],
  },
  {
    id: "files",
    title: "Files and setting documents",
    summary: "Create setting documents and link them with properties",
    lead: "Setting documents such as characters, places, organizations, items, events and worldbuilding have a title, a property table and a body. Relationships you link in the property table are what the graph, the timeline and AI chat read.",
    updatedAt: "2026-10-22",
    readMinutes: 4,
    facts: [
      { label: "Categories", value: "Manuscript + 6 setting kinds" },
      { label: "Create in", value: "Files in the sidebar" },
      { label: "Saving", value: "Automatic" },
    ],
    sections: [
      {
        id: "kinds",
        title: "Category folders",
        body: "Files has seven category folders: Manuscript, Character, Place, Organization, Item, Event and Worldbuilding. Every document sits in one of them, and the folder's category is the document's kind. The only folders you can create yourself are episodes inside the Manuscript folder.",
      },
      {
        id: "create",
        title: "Create a document",
        body: "Create one from any of these:\n\n- The more menu (⋯) at the top of Files, then a category.\n- A category folder's more menu, then its add item, such as Add character.\n- A category under Create new on a new tab.\n\nIn the sidebar a name field appears. Type a name and press Enter to create and open the document. Press Esc or leave the name empty to cancel.",
      },
      {
        id: "organize",
        title: "Move and favorite",
        body: "Open a document's menu with its more button (⋯), a right-click or Shift+F10, then choose Add to favorites, Rename or Move to trash.\n\n- Drag a document onto another category folder to change its category.\n- Drag a document onto the Favorites heading to add it to favorites.\n- The star next to a document's title also turns favorite on and off. Favorite documents get a star on their graph node and gather at the top of the timeline.",
      },
      {
        id: "property",
        title: "Add properties",
        body: "The property table under the title starts with Category and Description. A setting document can switch to another setting category from its Category row.\n\nSelect Add property to add:\n\n- Alias: other names or short forms, as many as you like.\n- Related manuscripts, Related characters, Related places, Related organizations, Related items, Related events, Related worldbuilding: link documents of that category. A relationship kind that is already there can't be added again.",
      },
      {
        id: "link",
        title: "Link documents and describe the link",
        body: "Select + on a relationship row, search for a document and pick it to add a chip. Select the chip's title to open that document, or × to unlink it. To remove the whole row, choose Delete property from the row icon's menu.\n\nHover over a chip and a Note button appears. Select it, describe the relationship (for example ‘mentor and student’) and press Enter; the note shows inside the chip and on the line in the graph. Clear the note and press Enter to remove it.",
      },
      {
        id: "status",
        title: "Check the save status",
        body: "Changes to the title, properties and body save automatically. The status at the right of the toolbar moves from Waiting to save to Saving… to Saved. If it reads Couldn't save, select Try again next to it. What you changed stays on screen.",
      },
    ],
    related: ["writing", "explore"],
  },
  {
    id: "writing",
    title: "Writing chapters",
    summary: "Formatting, find, lock, export and version history",
    lead: "A chapter is a title and a formatted body, and it saves automatically without a save button. Each document keeps its own font and line spacing, and version history lets you compare and restore earlier states.",
    updatedAt: "2026-10-22",
    readMinutes: 6,
    facts: [
      { label: "Document type", value: "Chapter" },
      { label: "Create in", value: "Chapters folder and episodes" },
      { label: "Saving", value: "Autosave · Version history" },
    ],
    sections: [
      {
        id: "episode",
        title: "Group chapters into episodes",
        body: "Choose Add episode from the Manuscript folder's more menu to create an episode folder. Add chapters to it with Add manuscript from the episode's more menu, or drag chapters onto it. You can also move a chapter from the Episode row of its property table.\n\nEpisodes set the column order of the timeline and the episode range in the graph.",
      },
      {
        id: "import",
        title: "Import an existing manuscript",
        body: "Select Import in the sidebar or on a new tab, then Choose files or drag files into the window. You can add several plain text (.txt) and Markdown (.md) files at once.\n\n- Check the files in the list and take out any you don't want.\n- Nothing is created until you select Import.\n- Each file name becomes a chapter title. Markdown keeps formatting such as headings and lists; plain text becomes one paragraph per line.",
      },
      {
        id: "format",
        title: "Fonts and formatting",
        body: "The toolbar's font, font size and line spacing apply only to the open document and are saved with it. Other documents keep their own look, so chapters and setting documents can use different fonts. ⌘Z undoes a formatting change too.\n\n- Fonts: Pretendard (default), Nanum Gothic, Nanum Myeongjo, Noto Serif KR and Mono. Fonts installed on this device (Malgun Gothic, Batang and others) look the same only on devices that have them.\n- Font size is 10–16pt (default 10.5pt) and line spacing is 1.5–2 (default 1.5).\n- Bold ⌘B, italic ⌘I, underline ⌘U, strikethrough ⌘⇧S, bulleted list ⌘⇧8, numbered list ⌘⇧7\n- Inside a list, Tab indents and Shift+Tab outdents.\n\nAlignment (⌘⇧L, E, R, J) applies to the whole document when nothing is selected, or only to the selected paragraphs. When the window is narrow, less-used tools move into the more menu (⋯).",
      },
      {
        id: "find",
        title: "Find and replace",
        body: "Press ⌘F or select Find and replace in the toolbar to open the find bar above the body. Type what to find and every match is marked, with a count of where you are. Enter goes to the next match and Shift+Enter to the previous one.\n\nType a replacement and select Replace or Replace all to fix a repeated phrase in one go. Matching ignores case, and Esc closes the bar.",
      },
      {
        id: "count",
        title: "Character count",
        body: "The toolbar shows the character count with spaces and without spaces. Only the body is counted, not the title.",
      },
      {
        id: "conflict",
        title: "When it was changed elsewhere",
        body: "If the same document was edited in another tab or on another device, changes to different paragraphs are merged automatically when it saves. Only when both sides changed the same paragraph does a notice appear, and you choose Keep my changes or Load the latest version.",
      },
      {
        id: "lock",
        title: "Lock a document",
        body: "Select Lock in the file tools to save any remaining changes and lock the document. A locked document's title, body, properties and formatting can't be changed, and versions can't be saved or restored. Use it to keep a finished chapter from accidental edits. Select Unlock to edit again.\n\nDocuments a graph refresh reads are locked too. That lock is lifted only when you confirm the refresh results or the refresh fails, and Unlock can't lift it. A note above the editor says so.",
      },
      {
        id: "export",
        title: "Export",
        body: "Choose a format from Export in the file tools. Any remaining changes save first.\n\n- PDF (⌘P): when the browser's print dialog opens, choose Save as PDF as the destination. The title, properties and body print in the document's font.\n- Markdown (.md): the title, category, properties and formatted body.\n- Plain text (.txt): the title and the body without formatting.\n\nMicrosoft Word (.docx) and Hangul (.hwp) are coming soon. Paragraph alignment isn't kept in Markdown or plain text.",
      },
      {
        id: "version",
        title: "Version history",
        body: "Select Version history in the file tools. Pick a version on the left to compare it side by side with the current document.\n\n- Save version keeps the current state as a version.\n- Restore this version goes back to the selected version. The state just before restoring is kept as a Before restore version, so a restore can be undone too.\n\nVersions are labeled with how they were made, such as Autosave, Saved manually, Before restore or From graph refresh. If an edit couldn't be saved, save it before restoring.",
      },
    ],
    related: ["files", "memo"],
  },
  {
    id: "explore",
    title: "Search and graph",
    summary: "Find anything in the project and explore relationships",
    lead: "Search finds text in the titles and bodies of your chapters and setting documents, and the graph shows the relationships you linked in property tables as a map.",
    updatedAt: "2026-10-22",
    readMinutes: 4,
    facts: [
      {
        label: "Search covers",
        value: "Titles and text of chapters and settings",
      },
      { label: "Graph source", value: "Property relationships" },
      { label: "Restores", value: "Category filter · Episode choice" },
    ],
    sections: [
      {
        id: "search",
        title: "Search documents",
        body: "Select Search at the top of the sidebar or press ⌘⇧F. Results appear shortly after you type, with the matching text marked in soft teal.\n\n- Each result shows its category, episode, when it was last edited and whether it is locked or a favorite.\n- Sort by Best match, Recently edited or Title above the list, and flip the order with the Descending/Ascending button next to them. Best match and Recently edited start descending; Title starts ascending (A to Z).\n- Best match has three tiers: documents whose title is exactly the search, then documents whose title contains it, then documents where only the body does. Within a tier, the most recently edited comes first.\n- Enter opens the first result. ↓ moves into the results, ↑↓ moves between them and Esc clears the search.\n\nDocuments in the trash aren't searched. Only the first 50 results show, so make the search more specific if there are too many. Words aren't split, so searching for ‘Lena's’ finds only places where that exact text appears.",
      },
      {
        id: "graph",
        title: "Explore the graph",
        body: "Nodes are documents and lines are the relationships linked in property tables. A document with more relationships has a bigger node, and favorite documents carry a star at the top right of their node.\n\nSelecting a node highlights the documents directly connected to it, and the Selected node panel on the right describes it and its neighbors. Select a card in the panel to open that document. Select more nodes to highlight each one's connections together, or select an empty spot to clear the selection. The words on a line are the note you wrote for that relationship in the property table.\n\nUse the zoom buttons to change the scale and Fit to screen to see everything again.",
      },
      {
        id: "find-node",
        title: "Find a node",
        body: "Select Find a node and type a name to see up to 8 matching nodes. Names that start with what you typed come first, then nodes with more relationships. Pick one and it becomes the only selected node and moves to the center.",
      },
      {
        id: "filter",
        title: "Filters and episodes",
        body: "Keep only the categories you want with Category filter, and choose an episode range from the Episode menu to keep only the nodes directly connected to those chapters. You can pick several episodes. The filter and episodes you chose stay the same next time.\n\nWhen there are more than 150 nodes, only manuscripts, characters and events show at first; select Show all in the banner to turn everything on.",
      },
    ],
    related: ["refresh", "files", "memo"],
  },
  {
    id: "refresh",
    title: "Graph refresh",
    summary: "Review and apply what's new in your chapters",
    lead: "Graph refresh has AI read the chapters and setting documents you changed and propose details and relationships to add to your setting documents. Nothing changes until you review the proposals and confirm them, and every applied document is kept in its version history.",
    updatedAt: "2026-10-24",
    readMinutes: 4,
    facts: [
      { label: "Start from", value: "Graph refresh in the sidebar" },
      { label: "Applying", value: "After you review" },
      { label: "Locked", value: "Until you confirm" },
    ],
    sections: [
      {
        id: "run",
        title: "Start a refresh",
        body: "Select Graph refresh in the sidebar and confirm with Start refresh. What you're writing is saved, the chapters and setting documents changed since the last refresh are sent, and the item changes to Refreshing graph… with the time waited so far. The documents sent stay locked until you confirm the results, so they can't be edited, renamed, moved or trashed.\n\nA refresh can take a few minutes. It keeps going if you switch views or browsers, and when it finishes you're notified and the item changes to Apply changes. Nothing starts if no document changed. If no result comes within an hour or the refresh fails, you're notified and the locks are lifted.",
      },
      {
        id: "review",
        title: "Review the proposals",
        body: "The list on the left shows each document that would change, marked modified (~) or added (+). Documents changed after the AI read them are marked as such. Pick one to see Current and Proposed side by side with the differences marked.\n\n- The arrow on each row copies that value to the other side. The Whole document arrow copies the entire document.\n- You can edit the title, properties, relationships and body directly on either side.\n- Use current keeps the document as it is, and Use proposed accepts the proposal. Reset returns that document to where it started.\n\nWhen both sides match, the document is settled and gets a check in the list.",
      },
      {
        id: "apply",
        title: "Apply the changes",
        body: "Apply changes turns on once every document is settled. What gets applied is the state both sides agree on. A proposed new document is created when you bring it to the left, and isn't created if you remove it from the right.\n\nEach applied document gets a From graph refresh version in its history, and confirming lifts every lock. If something can't be applied as it is, such as a relationship to a new document you chose not to create, you're told what's wrong and nothing is applied.",
      },
      {
        id: "later",
        title: "Finish later",
        body: "Your choices are saved as you go. Close the review or open it in another browser or device, and select Apply changes in the sidebar to pick up where you left off. A new refresh can't start until you confirm the review.",
      },
    ],
    related: ["explore", "writing"],
  },
  {
    id: "memo",
    title: "Notes and timeline",
    summary: "Jot down ideas and see where each document appears",
    lead: "Notes are working notes attached to the whole story or to one document. The timeline is a table of which chapters each setting document appears in.",
    updatedAt: "2026-10-22",
    readMinutes: 4,
    facts: [
      { label: "Notes for", value: "Story · Document" },
      { label: "Saving notes", value: "Save button · ⌘Enter" },
      { label: "Timeline axes", value: "Settings × chapters" },
    ],
    sections: [
      {
        id: "project-memo",
        title: "Story notes",
        body: "Open Notes in the sidebar, choose Story notes and select Add note. Keep as many notes about the whole story, ideas or to-dos as you like.\n\nChoose Document notes to see the notes left on each document, grouped by document; select a document's name to open it.",
      },
      {
        id: "file-memo",
        title: "The notes panel beside a document",
        body: "Select Notes in a document's file tools to open the notes panel beside it. Switch between this document's notes and story notes with the tabs at the top, and select + to write a new note.\n\n- Choose Right or Bottom under Notes position.\n- Drag the panel's edge to resize it.\n- If the panel is on the right and the editing area gets narrow, the panel folds away. Select Reopen to bring it back docked at the bottom.",
      },
      {
        id: "memo-save",
        title: "Save a note",
        body: "Notes don't save automatically. Write freely, and when you want to keep it select Save or press ⌘Enter (Ctrl+Enter on Windows). Cancel or Esc discards your changes.\n\nSelect a saved note's card to edit it in place, or its × to delete it. Deleted notes can't be recovered.",
      },
      {
        id: "timeline",
        title: "Read the timeline",
        body: "Columns are chapters, in episode order. Rows are setting documents grouped by category folder, with favorites gathered at the top. A filled bar marks a chapter the document appears in: one linked to that chapter through a property-table relationship.\n\n- Select a chapter heading once to select its column, twice to open the chapter.\n- Select a row's name to open that document.\n- Choose which chapters to show from the Episode menu and which rows from Rows to show.",
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
        body: "Type a question on the first screen, or pick a suggested one, to start a new conversation. The answer appears once the whole story has been read, and while you wait you can see what it's doing and how long it has taken.",
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
    summary: "Bring items back or delete them for good",
    lead: "Deleted documents go to the workspace trash and deleted projects go to the trash in your project list. From the trash you can restore them to where they were, or delete them permanently after confirming.",
    updatedAt: "2026-10-22",
    readMinutes: 2,
    facts: [
      { label: "Kept in", value: "Workspace · project trash" },
      { label: "Restores to", value: "Original location" },
      { label: "Permanent delete", value: "After confirmation" },
    ],
    sections: [
      {
        id: "move",
        title: "Move to trash",
        body: "Move a document with Move to trash in its sidebar menu. Move a project from its card menu or from the Danger zone in project settings. Moving a document closes any tabs it was open in.",
      },
      {
        id: "restore",
        title: "Restore",
        body: "Open Trash at the bottom of the workspace sidebar to see deleted documents with their original path and when they were deleted. Select Restore to put one back where it was, and Open in the notification to open it straight away.\n\nRestore projects from Trash on the left of your project list.",
      },
      {
        id: "delete",
        title: "Delete permanently",
        body: "Select Delete permanently and confirm to remove an item for good; it can't be restored. Deleting a project permanently removes all of its files and settings with it.",
      },
      {
        id: "episode",
        title: "Delete an episode folder",
        body: "Episode folders don't go to the trash. Choose Delete episode folder from an episode's more menu and only the folder goes; the chapters in it return to the Manuscript folder.",
      },
    ],
    related: ["files", "start"],
  },
  {
    id: "settings",
    title: "Settings and account",
    summary: "Project details, theme, language and your account",
    lead: "Change a project's name and description in the workspace's Settings, and your display name, language and theme from the account menu.",
    updatedAt: "2026-10-22",
    readMinutes: 2,
    facts: [
      { label: "Project settings", value: "Settings in the sidebar" },
      { label: "Account settings", value: "Account menu" },
      { label: "Saving", value: "Save changes button" },
    ],
    sections: [
      {
        id: "project",
        title: "Project settings",
        body: "Change the project's name and description under Settings at the bottom of the workspace sidebar. When you change something, Cancel and Save changes appear below; your edits save only when you select Save changes. If you try to close the tab without saving, you're asked whether to discard them.",
      },
      {
        id: "theme",
        title: "Theme and language",
        body: "Choose Use system setting, Dark or Light under Theme in the account menu at the top left. To change the language, pick Korean or English under Language in Account settings; it switches right away.",
      },
      {
        id: "account",
        title: "Account settings",
        body: "Change your display name in Account settings from the account menu. Your email comes from the Google account you signed in with and can't be changed.",
      },
      {
        id: "delete-account",
        title: "Delete your account",
        body: "Select Delete account under Account settings. You're asked why you're leaving (answering is optional) and shown what will be deleted. Type your account email exactly to confirm. All projects and trash items are deleted permanently and can't be recovered.",
      },
      {
        id: "feedback",
        title: "Send feedback",
        body: "Write to us from Send feedback in your project list or under Help in the workspace. ⌘Enter (Ctrl+Enter on Windows) sends it too.",
      },
    ],
    related: ["start", "trash"],
  },
];
