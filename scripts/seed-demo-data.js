/*
 * 로그인한 내 계정에 예시 자료를 넣는다. 원고 두 편, 설정 문서 열셋, 메모, 즐겨찾기까지.
 *
 * 쓰는 법: https://loresentry.com 에 로그인한 상태로 그 탭의 개발자 도구 콘솔에 이 파일을
 * 통째로 붙여 넣고 실행한다.
 *
 * 왜 브라우저인가. 이 API 는 쿠키로만 신원을 확인하고, 그 쿠키는 HttpOnly 라 바깥에서 읽을 수
 * 없다. 그래서 자격 증명을 옮기거나 사용자 id 를 찾아낼 필요 없이, 로그인한 그 탭이 자기 손으로
 * 만들게 한다. 만들어지는 자료의 주인은 그 계정이다.
 *
 * 한 번 더 실행하면 같은 이름의 프로젝트가 또 생긴다. 서버는 프로젝트 이름 중복을 막으므로
 * PROJECT_NAME 을 바꾸거나 먼저 지운다.
 */
(async () => {
  const API = "https://api.loresentry.com";
  const PROJECT_NAME = "빙하 아래의 도서관";

  const call = async (method, path, body) => {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (method !== "GET") headers["X-LS-CSRF"] = "1";
    const response = await fetch(`${API}${path}`, {
      method,
      credentials: "include",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(
        `${method} ${path} → ${response.status} ${await response.text()}`,
      );
    }
    return response.status === 204 ? null : response.json();
  };

  // 문서 본문 저장은 조건부다. revision 을 실어야 서버가 다른 저장과의 충돌을 알아본다.
  const saveContent = async (fileId, revision, content) => {
    const response = await fetch(`${API}/files/${fileId}/content`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-LS-CSRF": "1",
        "If-Match": `"${revision}"`,
        "X-Save-Id": crypto.randomUUID(),
      },
      body: JSON.stringify(content),
    });
    if (!response.ok) {
      throw new Error(
        `PUT /files/${fileId}/content → ${response.status} ${await response.text()}`,
      );
    }
    return response.json();
  };

  const me = await call("GET", "/auth/users/me");
  console.log(`계정: ${me.display_name} <${me.email}>`);

  const project = await call("POST", "/projects", {
    name: PROJECT_NAME,
    description:
      "남극 빙하 3킬로미터 아래에서 발견된 도서관, 그리고 그곳을 지키도록 태어난 사서들의 이야기.",
  });
  console.log(`프로젝트 생성: ${project.name} (${project.id})`);

  const created = new Map();

  const settingDoc = async (folderCode, title, description, alias, bodyMd) => {
    const doc = await call("POST", `/projects/${project.id}/files`, {
      kind: "document",
      title,
      folder_code: folderCode,
      episode_id: null,
    });
    const properties = [{ key: "description", value: description }];
    if (alias) properties.push({ key: "alias", value: alias });
    await saveContent(doc.id, doc.revision_no, {
      title,
      body_md: bodyMd,
      properties,
      relations: [],
    });
    created.set(title, doc.id);
    console.log(`  · ${folderCode} ${title}`);
    return doc.id;
  };

  const scene = async (episodeId, title, bodyMd) => {
    const doc = await call("POST", `/projects/${project.id}/files`, {
      kind: "document",
      title,
      folder_code: "MANUSCRIPT",
      episode_id: episodeId,
    });
    await saveContent(doc.id, doc.revision_no, {
      title,
      body_md: bodyMd,
      properties: [],
      relations: [],
    });
    created.set(title, doc.id);
    console.log(`  · 원고 ${title} (${bodyMd.length}자)`);
    return doc.id;
  };

  console.log("세계관·설정 문서를 만든다");

  await settingDoc(
    "WORLDVIEW",
    "빙하 도서관",
    "남위 78도, 얼음 3,200미터 아래의 공동. 그 안의 책은 누가 쓰지 않아도 쓰인다.",
    "제12서고",
    `## 발견

2041년, 보르홀 시추팀은 3,200미터에서 드릴이 **허공으로 떨어지는** 소리를 들었다. 얼음 아래에 공동이 있었다. 공동의 벽은 서가였다.

## 규모

열람실은 지금까지 스물세 개가 확인됐다. 서가는 얼음이 아니라 얼음이 기억하는 무엇으로 만들어져 있고, 손을 대면 미지근하다.

## 책이 쓰이는 방식

책은 누가 쓰지 않는다. 바깥에서 일어난 일이 이 아래에서 문장이 된다. 다만 **이름이 빠진다.** 사서의 일은 빠진 이름을 찾아 채우는 것이다.`,
  );

  await settingDoc(
    "WORLDVIEW",
    "세 가지 서약",
    "사서가 지켜야 하는 규칙. 셋째 규칙의 내용은 사서만 알고, 사서는 그것을 말할 수 없다.",
    "",
    `1. **읽은 것을 바깥에 옮기지 않는다.** 옮겨진 문장은 그 자리에서 사라지고, 사라진 문장이 있던 사건도 함께 사라진다.
2. **빈 이름을 비워 두지 않는다.** 비워 둔 이름은 아무나 가져간다.
3. *(기록되지 않음)*

셋째 규칙은 취임하는 사서에게만 구술된다. 열한 명의 사서가 그것을 지켰고, 열두 번째가 그것을 어길지가 이 이야기다.`,
  );

  const seorihan = await settingDoc(
    "CHARACTER",
    "서리한",
    "제12대 사서. 도서관에서 태어나 바깥을 본 적이 없다. 열아홉.",
    "열두 번째",
    `얼음 아래에서 태어난 사람이 있다는 것을 바깥은 믿지 않는다.

서리한은 자기 나이를 책으로 안다. 자기가 태어난 해의 책을 펼쳐 보면 그 문장에 이름이 비어 있고, 그 빈 칸이 자기 자리라는 것을 여덟 살에 알았다.

**말버릇.** 문장을 끝까지 말하지 않는다. 끝까지 말하면 그것이 기록된다고 배웠기 때문이다.`,
  );

  const yoondogyeong = await settingDoc(
    "CHARACTER",
    "윤도경",
    "지질학자. 보르홀 캠프 제2차 조사단. 도서관에 처음으로 초대된 외부인.",
    "",
    `측정값을 믿는 사람이다. 그래서 도서관을 믿지 못하고, 믿지 못하는 상태로 매일 내려온다.

서리한에게 처음 건넨 말은 질문이 아니라 사과였다. "우리가 뚫어서, 미안해요."

**목표.** 이 공동이 자연 구조물임을 증명하려 한다. 증명에 실패할 때마다 한 걸음 더 깊이 들어간다.`,
  );

  const mokryeon = await settingDoc(
    "CHARACTER",
    "목련",
    "제11대 사서. 3년 전 제3열람실에서 실종. 장갑 한 짝만 남았다.",
    "열한 번째",
    `서리한을 키운 사람이다. 가르친 사람이라고는 하지 않는다 — 목련은 가르치는 대신 읽게 했다.

마지막으로 남긴 말은 서가에 분필로 쓰여 있었고, 다음 날 아침 그 문장은 사라졌다. 서리한은 그것을 읽었고, 읽었다는 사실만 기억한다.`,
  );

  const readingRoom = await settingDoc(
    "LOCATION",
    "제3열람실",
    "아직 쓰이는 중인 책들이 놓인 방. 사서 외에는 들어가지 않는다.",
    "",
    `천장이 없다. 위를 보면 얼음이 아니라 **글씨가 지나간다.**

책상은 열한 개다. 열두 번째 책상은 서리한이 취임한 날 저절로 생겼다.

목련이 사라진 자리에는 아무 표시도 없다. 표시를 하면 그것이 기록되기 때문에 하지 않았다.`,
  );

  await settingDoc(
    "LOCATION",
    "보르홀 캠프",
    "지상의 조사 기지. 도서관 입구까지 수직 3,200미터.",
    "",
    `컨테이너 여섯 동, 발전기 두 대, 위성 안테나 하나. 겨울이면 여섯 달 동안 바깥과 끊긴다.

캠프에서 도서관까지는 케이지로 마흔 분이 걸린다. 그 마흔 분 동안 통신이 되지 않는다는 점이 이 이야기에서 여러 번 중요해진다.`,
  );

  await settingDoc(
    "LOCATION",
    "얼어붙은 계단",
    "열람실과 열람실 사이를 잇는 계단. 내려갈 때와 올라올 때 칸 수가 다르다.",
    "",
    `내려갈 때는 백열두 칸, 올라올 때는 백열세 칸이다. 목련은 그 한 칸을 "빌린 칸" 이라고 불렀고 그 이상은 설명하지 않았다.`,
  );

  await settingDoc(
    "ORGANIZATION",
    "남극 공동조사단",
    "열한 개 나라가 함께 만든 조사 기구. 도서관의 존재를 공표하지 않았다.",
    "",
    `공표하지 않은 이유는 셋이다. 첫째는 검증이 안 되기 때문, 둘째는 관할이 정해지지 않았기 때문, 셋째는 **공표문 초안이 세 번 연속 사라졌기** 때문이다.`,
  );

  await settingDoc(
    "ORGANIZATION",
    "사서회",
    "역대 사서 열두 명. 살아 있는 사람은 한 명이다.",
    "",
    `회의는 열린다. 참석자는 한 명이지만 기록에는 열두 명의 발언이 남는다. 서리한은 그 기록을 읽는 것으로 회의에 참석한다.`,
  );

  const writingBook = await settingDoc(
    "ITEM",
    "쓰이는 중인 책",
    "펼쳐 두면 문장이 늘어나는 책. 이름 자리만 비어 있다.",
    "",
    `표지가 없다. 표지를 만들면 그 책은 완성된 것으로 취급되어 더 쓰이지 않는다.

지금 제3열람실에서 가장 빠르게 쓰이는 책의 첫 문장은 이렇다.

> 그해 겨울, ____ 는 셋째 규칙을 어겼다.`,
  );

  await settingDoc(
    "ITEM",
    "목련의 장갑",
    "실종 현장에 남은 왼쪽 장갑. 안쪽에 분필 가루가 묻어 있다.",
    "",
    `오른쪽은 없다. 서리한은 그것을 자기 주머니에 넣고 다니며, 누구에게도 보여 주지 않는다.`,
  );

  await settingDoc(
    "EVENT",
    "목련의 실종",
    "3년 전. 제3열람실, 새벽. 목격자 없음.",
    "",
    `그날 밤 서가에 쓰인 문장은 한 줄이었다. 다음 날 아침 그 줄은 없었다.

**남은 것.** 장갑 한 짝, 분필 가루, 그리고 백열세 번째 칸.`,
  );

  await settingDoc(
    "EVENT",
    "첫 균열",
    "조사단이 시추를 재개한 날, 제3열람실 천장에 금이 갔다.",
    "",
    `금은 글씨의 모양이었다. 윤도경은 그것을 응력 파괴라고 기록했고, 같은 날 그 기록 파일이 열리지 않았다.`,
  );

  console.log("원고를 만든다");

  const part1 = await call("POST", `/projects/${project.id}/files`, {
    kind: "episode",
    title: "1부 — 얼음이 말을 걸 때",
  });
  const part2 = await call("POST", `/projects/${project.id}/files`, {
    kind: "episode",
    title: "2부 — 세 번째 규칙",
  });

  const firstScene = await scene(
    part1.id,
    "1. 드릴이 허공을 만난 날",
    `드릴이 멈춘 것이 아니라 떨어졌다.

윤도경은 그 소리를 나중에 이렇게 적었다. *3,200미터에서 저항이 0이 되었다.* 숫자로는 그게 전부였다. 실제로 들린 것은, 오래 닫혀 있던 방의 문이 안쪽에서 열리는 소리였다.

케이지가 내려가는 마흔 분 동안 아무도 말하지 않았다. 통신이 끊기는 구간이라 어차피 기록되지 않을 대화였다.

바닥에 닿았을 때, 헬멧 등이 비춘 것은 얼음이 아니었다. 서가였다. 그리고 서가 앞에 사람이 서 있었다.

"늦었어요." 그 사람이 말했다. "아니, 늦지 않았— "

문장은 끝나지 않았다.`,
  );

  await scene(
    part1.id,
    "2. 이름이 비어 있는 책",
    `서리한은 책을 펼쳐 보이면서도 손끝으로 한 곳을 가렸다.

"여기가 비어 있어요."

윤도경이 들여다본 자리에는 정말로 아무것도 없었다. 글자가 지워진 자리가 아니라, 애초에 글자를 놓지 않은 자리처럼 매끈했다.

"누가 채우죠?"

"제가요."

"틀리면요?"

서리한은 처음으로 문장을 끝까지 말했다. "틀린 이름을 가진 사람이 그 일을 하게 돼요."

윤도경은 그날 밤 캠프로 올라가 보고서를 쓰다가 세 번째 문단에서 멈췄다. 자기가 방금 무엇을 옮겨 적으려 했는지 생각하다가, 그 문단을 지웠다. 지운 것이 옳았는지는 지금도 모른다.`,
  );

  await scene(
    part1.id,
    "3. 백열세 번째 칸",
    `내려갈 때 백열두 칸, 올라올 때 백열세 칸.

윤도경은 세 번 세어 보고 네 번째에 포기했다. 서리한은 그걸 보고 웃지 않았다. 대신 계단 중간에 앉아 이렇게 물었다.

"한 칸이 더 있으면, 그건 누가 밟나요?"

"…빌린 사람이요."

"누가 빌려줬을까요."

서리한은 대답하지 않았다. 주머니 속에서 왼쪽 장갑을 한 번 쥐었다가 놓았다.`,
  );

  await scene(
    part2.id,
    "4. 규칙을 말할 수 없는 이유",
    `셋째 규칙은 소리로만 전해진다. 종이에 적히는 순간 규칙이 아니게 되기 때문이다.

취임하던 날, 목련은 서리한의 귀에 대고 아홉 글자를 말했다. 서리한은 그 아홉 글자를 3년 동안 한 번도 떠올리지 않는 연습을 했다. 떠올리는 것도 절반쯤은 기록이라고 배웠다.

그런데 천장에 금이 간 날, 그 금의 모양이 아홉 글자 중 첫 글자였다.`,
  );

  await scene(
    part2.id,
    "5. 어기기로 한다",
    `서리한은 표지를 만들기로 했다.

표지를 만들면 그 책은 완성된 것으로 취급되어 더 쓰이지 않는다. 쓰이지 않으면 빈 이름도 생기지 않는다. 빈 이름이 생기지 않으면 아무도 그 자리에 들어가지 않는다.

그것이 셋째 규칙을 어기는 방법이었다. 그리고 목련이 3년 전에 하려던 일이었다.

윤도경이 물었다. "그러면 당신은 어떻게 되죠?"

"저는 이미 책 안에 있어요." 서리한이 말했다. "태어난 해의 문장에, 이름 없이."`,
  );

  console.log("관계를 잇는다");

  /**
   * 관계는 양방향이다. 서버가 한쪽 저장에서 반대쪽 문서에도 행을 넣으므로, 여기서 관계를 그냥
   * 덮어쓰면 **먼저 만든 관계가 지워진다.** 지금 있는 것에 더한다.
   */
  const link = async (title, relations) => {
    const fileId = created.get(title);
    const current = await call("GET", `/files/${fileId}/content`);
    const merged = [...current.relations];
    for (const relation of relations) {
      const already = merged.some(
        (existing) =>
          existing.relation_key === relation.relation_key &&
          existing.target_document_id === relation.target_document_id,
      );
      if (!already) merged.push(relation);
    }
    await saveContent(fileId, current.revision_no, {
      title: current.title,
      body_md: current.body_md,
      properties: current.properties,
      relations: merged,
    });
    console.log(`  · ${title} → ${merged.length}개`);
  };

  await link("서리한", [
    { relation_key: "related_character", target_document_id: mokryeon },
    { relation_key: "related_character", target_document_id: yoondogyeong },
    { relation_key: "related_place", target_document_id: readingRoom },
    { relation_key: "related_item", target_document_id: writingBook },
  ]);
  await link("목련", [
    { relation_key: "related_character", target_document_id: seorihan },
    { relation_key: "related_place", target_document_id: readingRoom },
    {
      relation_key: "related_item",
      target_document_id: created.get("목련의 장갑"),
    },
    {
      relation_key: "related_event",
      target_document_id: created.get("목련의 실종"),
    },
  ]);
  await link("윤도경", [
    { relation_key: "related_character", target_document_id: seorihan },
    {
      relation_key: "related_place",
      target_document_id: created.get("보르홀 캠프"),
    },
    {
      relation_key: "related_event",
      target_document_id: created.get("첫 균열"),
    },
  ]);
  await link("제3열람실", [
    { relation_key: "related_item", target_document_id: writingBook },
    {
      relation_key: "related_event",
      target_document_id: created.get("목련의 실종"),
    },
    {
      relation_key: "related_worldview",
      target_document_id: created.get("빙하 도서관"),
    },
  ]);

  console.log("메모와 즐겨찾기");

  await call("POST", `/projects/${project.id}/memos`, {
    scope: "project",
    document_id: null,
    body: "셋째 규칙의 아홉 글자를 끝까지 보여 주지 않는다. 독자가 짐작할 재료만 세 번 흘린다 — 천장의 금, 계단의 한 칸, 태어난 해의 빈 이름.",
  });
  await call("POST", `/projects/${project.id}/memos`, {
    scope: "project",
    document_id: null,
    body: "윤도경의 시점은 2부에서 한 장면만 쓴다. 관찰자가 너무 오래 설명하면 얼음 아래가 평범해진다.",
  });
  await call("POST", `/projects/${project.id}/memos`, {
    scope: "file",
    document_id: firstScene,
    body: '첫 문장은 "떨어졌다" 로 끝나야 한다. 소리가 아니라 낙하로 시작해야 아래에 공간이 있다는 게 먼저 느껴진다.',
  });

  await call("PUT", `/projects/${project.id}/favorites/${seorihan}`, undefined);
  await call(
    "PUT",
    `/projects/${project.id}/favorites/${firstScene}`,
    undefined,
  );
  await call(
    "PUT",
    `/projects/${project.id}/favorites/${created.get("세 가지 서약")}`,
    undefined,
  );

  const tree = await call("GET", `/projects/${project.id}/files`);
  console.log(
    `완료. 문서 ${tree.documents.length}개, 에피소드 ${tree.episodes.length}개.`,
  );
  console.log(`https://loresentry.com/workspace/?projectId=${project.id}`);
})().catch((error) => console.error("시드 실패:", error));
