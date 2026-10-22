import type { Messages } from "../messages";

export default {
  "새 대화": "New conversation",
  "대화 이름을 입력해 주세요.": "Enter a name for the conversation.",
  "고칠 질문을 찾을 수 없어요.": "Couldn't find the question to edit.",

  "AI 챗": "AI chat",
  "작품을 아는 AI 챗": "AI chat that knows your story",
  "AI 챗 열기": "Open AI chat",
  "AI 챗 접기": "Close AI chat",
  "AI 챗 열기, 답을 쓰는 중": "Open AI chat, writing an answer",
  "AI 챗 열기, 새 답변": "Open AI chat, new answer",
  "AI 챗을 열 수 없어요": "AI chat isn't available",
  "AI 챗을 불러오지 못했어요": "Couldn't load AI chat",
  "작품이 커서 AI 챗을 열 수 없어요": "This story is too long for AI chat",
  "AI 챗은 원고·설정·메모를 한 번에 모두 읽고 답해요. 지금 작품은 약 {size}자로, 한 번에 읽을 수 있는 {limit}자를 넘었어요.":
    "AI chat reads your whole manuscript, settings and notes at once before it answers. This story is about {size} characters long, more than the {limit} it can read at once.",
  접기: "Collapse",
  "{name} 님, 무엇이 궁금하세요?": "What would you like to know, {name}?",
  "작품에 대해 물어보세요": "Ask about your story",
  "새 대화를 시작해 보세요": "Start a new conversation",
  대화: "Conversations",
  "대화 검색": "Search conversations",
  "검색어 지우기": "Clear search",
  "찾는 중": "Searching",
  "대화 {count}개": "{count} conversations",
  "‘{query}’와 맞는 대화가 없어요": "No conversations match “{query}”",
  "아직 나눈 대화가 없어요": "No conversations yet",
  "이렇게 물어보세요": "Try asking",
  "가장 최근 회차에서 무슨 일이 있었어?":
    "What happened in the latest chapter?",
  "주요 인물과 연결된 설정을 정리해 줘":
    "Sum up the settings linked to the main characters",
  "주인공이 처음 흔들리는 장면은 어디야?":
    "Where does the protagonist first waver?",
  "대화 목록": "All conversations",
  "답을 쓰는 중": "Writing an answer",

  "대화 메뉴": "Conversation menu",
  "대화 이름": "Conversation name",
  "이름 바꾸기": "Rename",
  "대화 삭제": "Delete conversation",
  "‘{title}’ 대화를 지울까요?": "Delete “{title}”?",
  "지운 대화는 되돌릴 수 없어요.": "A deleted conversation can't be restored.",

  질문: "Question",
  "인용 빼기": "Remove quote",
  "이 부분에 대해 물어보세요": "Ask about this passage",
  "응답 멈추기": "Stop answering",
  "보내기 (Enter)": "Send (Enter)",

  "원고와 설정을 모으는 중": "Gathering your manuscript and settings",
  "필요한 문서를 읽는 중": "Reading what the question needs",
  "{seconds}초": "{seconds}s",
  "답변 복사": "Copy answer",
  "답변을 복사했어요": "Answer copied",
  "질문 고치기": "Edit question",
  "응답을 멈췄어요. 끝나지 않은 답은 남기지 않아요.":
    "Stopped answering. Unfinished answers aren't kept.",
  "답을 받지 못했어요. 잠시 후 다시 물어봐 주세요.":
    "Couldn't get an answer. Please ask again in a moment.",
  "다시 묻기": "Ask again",
  "맨 아래로": "Jump to latest",

  "메모 ‘{title}’ 열기": "Open note “{title}”",
  "근거 문서 ‘{title}’ 열기": "Open source document “{title}”",
  "메모 · {title}": "Note · {title}",
  "작가 메모": "Your note",
  "눌러서 메모 보기": "Click to view the note",
  "눌러서 문서 열기": "Click to open the document",

  "챗 창 폭 조절": "Resize chat width",
  "챗 창 높이 조절": "Resize chat height",

  "선택한 부분으로 AI에게 묻기": "Ask AI about the selection",
  "AI에게 묻기": "Ask AI",
  "설명해 줘": "Explain",
  "관련 설정": "Related settings",
  "앞뒤 흐름": "Before and after",
  "이 부분을 설명해 줘": "Explain this passage",
  "이 부분과 관련된 설정을 알려 줘":
    "Show the settings related to this passage",
  "이 부분의 앞뒤 흐름을 알려 줘":
    "What happens before and after this passage?",
  "질문을 입력해 주세요.": "Type a question.",
  "마지막 질문만 고칠 수 있어요.": "Only the last question can be edited.",
  "답을 받는 중에 연결이 끊겼어요.":
    "The connection dropped while the answer was coming in.",
  "AI가 지금 답할 수 없어요. 잠시 뒤 다시 물어봐 주세요.":
    "The AI can't answer right now. Please ask again in a moment.",
  "AI 챗 서버에 연결할 수 없어요.": "Can't reach the AI chat server.",
  "이 대화에서 답을 쓰는 중이에요. 끝난 뒤에 다시 보내 주세요.":
    "An answer is still being written in this conversation. Send again once it's done.",
  "오늘 AI 챗 사용량을 다 썼어요.": "You've used up today's AI chat.",
  "오늘 AI 챗 사용량을 다 썼어요": "You've used up today's AI chat",
  "자정에 0%로 비워져요. 지난 대화는 계속 볼 수 있어요.":
    "It resets to 0% at midnight. Your past conversations are still here.",
  "오늘 AI 챗 사용량 {percent}%": "Today's AI chat usage {percent}%",
  "오늘 사용량": "Today's usage",
  "자정에 0%로 비워져요.": "Resets to 0% at midnight (Korea time).",
  "오늘 사용량의 {percent}%를 썼어요": "You've used {percent}% of today's chat",
  "100%가 되면 자정까지 쉬어요.": "At 100%, chat pauses until midnight.",
  "알림 닫기": "Dismiss",
  "오늘 사용량을 다 썼어요": "Today's usage is used up",
  "자정에 0%로 비워져요. 지난 대화와 근거는 그대로 볼 수 있어요.":
    "It resets to 0% at midnight. You can still open past conversations and their sources.",
  "{time} 뒤 다시 물을 수 있어요": "You can ask again in {time}",
  "자정에 비워져요": "Resets at midnight",
  "AI 챗 열기, 오늘 사용량을 다 썼어요":
    "Open AI chat, today's usage is used up",
  "{minutes}분": "{minutes} min",
  "{hours}시간": "{hours} h",
  "{hours}시간 {minutes}분": "{hours} h {minutes} min",
  "다른 대화에서 답을 쓰는 중이에요. 끝난 뒤에 다시 보내 주세요.":
    "An answer is being written in another conversation. Send again once it's done.",
  "다른 대화에서 답을 쓰는 중이에요": "Another conversation is still answering",
  "작품 지도 확인": "Looked over the story map",
  "읽은 문서로 답을 쓰는 중": "Writing an answer from what it read",
  "읽을 문서를 고르는 중": "Choosing what to read",
  "더 읽을지 정하는 중": "Deciding whether to read more",
  "문서를 읽는 중": "Reading",
  읽음: "Read",
  "{step}단계 · {count}개": "Step {step} · {count}",
  "분량이 넘친 {count}개는 다음 단계로": "{count} more saved for the next step",
  "답을 검토하는 중": "Checking the answer",
  "검토 통과": "Answer checked",
  "검토 · 보완 필요": "Check · needs more",
  "더 찾을 것 · {fact}": "Still to find · {fact}",
  "고칠 점 {count}개": "{count} things to fix",
  "검토를 반영해 마지막 답을 쓰는 중":
    "Writing the final answer with the review in mind",
  "외 {count}개": "+{count} more",
  "답을 준비하는 과정": "How the answer is coming together",
} satisfies Messages;
