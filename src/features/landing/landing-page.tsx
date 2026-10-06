"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { useRuntimeConfig } from "@/app/providers";
import { Icon, type IconName } from "@/design-system/primitives";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_META } from "@/domain/document-types";
import { GoogleMark } from "@/features/auth/google-mark";
import { useSession } from "@/features/auth/session-gate";
import { cx } from "@/shared/cx";

import { SceneFrame } from "./scene-frame";
import { StoryThread } from "./story-thread";
import { useStartWriting } from "./use-start-writing";
import styles from "./landing.module.css";

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const read = () => setScrolled(window.scrollY > 8);
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, []);
  return scrolled;
}

function StartButton({ size = "lg" }: { size?: "sm" | "lg" }) {
  const session = useSession();
  const { start, starting } = useStartWriting();
  const className = cx(styles.button, styles.primary, styles[size]);
  if (session.data) {
    return (
      <Link className={className} href="/projects/">
        {size === "sm" ? "내 프로젝트" : "내 프로젝트 열기"}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={className}
      onClick={start}
      disabled={starting}
      aria-busy={starting || undefined}
    >
      {size === "lg" &&
        (starting ? (
          <Icon name="loader-circle" size={18} className={styles.spin} />
        ) : (
          <span className={styles.googleDisc}>
            <GoogleMark />
          </span>
        ))}
      {starting
        ? "Google로 이동 중…"
        : size === "lg"
          ? "Google로 시작하기"
          : "시작하기"}
    </button>
  );
}

function Header() {
  const scrolled = useScrolled();
  const session = useSession();
  const { contactEmail } = useRuntimeConfig();
  return (
    <header className={styles.header} data-scrolled={scrolled || undefined}>
      <div className={styles.headerInner}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark} aria-hidden="true">
            L
          </span>
          Lore Sentry
        </Link>
        <nav className={styles.nav} aria-label="랜딩 메뉴">
          <a href="#intro">서비스 소개</a>
          <a href="#organize">기능</a>
          <a href="#refresh">AI 최신화</a>
          {contactEmail && <a href={`mailto:${contactEmail}`}>문의하기</a>}
        </nav>
        <div className={styles.headerActions}>
          {!session.data && (
            <Link
              className={cx(styles.button, styles.quiet, styles.sm)}
              href="/login/"
            >
              로그인
            </Link>
          )}
          <StartButton size="sm" />
        </div>
      </div>
    </header>
  );
}

function Point({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className={styles.point}>
      <Icon name={icon} size={18} className={styles.pointIcon} />
      <span>
        <b>{title}</b>
        {children}
      </span>
    </li>
  );
}

/**
 * 창과 설명을 나란히 놓는 장. 장마다 비율과 세로 자리를 달리해 같은 모양이 번갈아 나오는
 * 목록처럼 읽히지 않게 한다. `wide` 는 창을 가운데 크게 두고 설명을 위에 얹는다.
 */
type ChapterLayout = "windowLeft" | "windowRight" | "windowLate" | "wide";

function Chapter({
  id,
  title,
  children,
  layout,
  aside,
}: {
  id?: string;
  title: string;
  children: ReactNode;
  layout: ChapterLayout;
  aside?: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cx(styles.chapter, styles[layout])}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <div className={styles.copy}>
        <h2 id={id ? `${id}-title` : undefined} className={styles.h2}>
          {title}
        </h2>
        {children}
      </div>
      {aside}
    </section>
  );
}

function Footer() {
  const { contactEmail, termsOfServiceUrl, privacyPolicyUrl } =
    useRuntimeConfig();
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <span className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              L
            </span>
            Lore Sentry
          </span>
          <p>SW마에스트로 프로젝트로 만들고 있어요.</p>
        </div>
        <nav className={styles.footerLinks} aria-label="바닥글">
          {contactEmail && (
            <a href={`mailto:${contactEmail}`}>문의하기 · {contactEmail}</a>
          )}
          <a href={termsOfServiceUrl} target="_blank" rel="noreferrer">
            이용약관
          </a>
          <a href={privacyPolicyUrl} target="_blank" rel="noreferrer">
            개인정보처리방침
          </a>
        </nav>
        <p className={styles.copyright}>© 2026 Lore Sentry</p>
      </div>
    </footer>
  );
}

export function LandingPage() {
  const [story, setStory] = useState<HTMLElement | null>(null);

  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#main">
        본문으로 건너뛰기
      </a>
      <Header />

      <main id="main" ref={setStory} className={styles.story}>
        <StoryThread root={story} />

        <section className={styles.hero} aria-labelledby="hero-title">
          <h1 id="hero-title" className={styles.h1}>
            원고 한 줄에서
            <br />
            작품 전체가 이어져요
          </h1>
          <p className={styles.lede}>
            웹소설 회차와 인물·장소·세계관 문서를 한 작업공간에 두고 써요. 속성
            표로 이어 둔 관계가 그래프와 타임라인으로 바로 보여요.
          </p>
          <div className={styles.ctaRow}>
            <StartButton />
            <a
              className={cx(styles.button, styles.secondary, styles.lg)}
              href="#intro"
            >
              둘러보기
            </a>
          </div>
          <SceneFrame
            scene="editor"
            eager
            className={styles.heroFrame}
            label="원고 에디터에서 12화를 쓰는 화면. 오른쪽에 문서 메모가 열려 있다."
          />
        </section>

        <section
          id="intro"
          className={cx(styles.chapter, styles.chapterQuiet)}
          aria-labelledby="intro-title"
        >
          <div className={styles.copy}>
            <h2 id="intro-title" className={styles.h2}>
              쓰는 동안엔
              <br />
              쓰기만 하세요
            </h2>
            <p className={styles.body}>
              저장 버튼을 찾을 일이 없어요. 손을 멈추면 저장되고, 연결이 끊겨도
              쓴 글을 붙든 채 다시 시도해요.
            </p>
            <ul className={styles.points}>
              <Point icon="history" title="버전 기록">
                원하는 순간을 이름 붙여 남기고, 예전 버전과 나란히 비교해
                되돌려요.
              </Point>
              <Point icon="notebook-pen" title="문서 옆 메모">
                복선과 다음 화 계획을 원고 옆에 적어 둬요.
              </Point>
              <Point icon="type" title="내 손에 맞는 에디터">
                글꼴과 줄 간격은 기기마다 기억하고, 찾기·바꾸기와 글자 수가 늘
                곁에 있어요.
              </Point>
              <Point icon="file-text" title="내보내기">
                Markdown, TXT, PDF로 내려받아요.
              </Point>
            </ul>
          </div>
        </section>

        <Chapter
          id="organize"
          layout="windowLeft"
          title={"회차와 설정 문서를\n한 작업공간에"}
          aside={
            <SceneFrame
              scene="files"
              className={styles.chapterFrame}
              label="원고를 에피소드로 묶은 파일 트리와, 12화 원고와 캐릭터 문서 레나 아르벨을 나란히 연 분할 보기"
            />
          }
        >
          <p className={styles.body}>
            원고는 에피소드로 묶고, 설정 문서는 분류마다 정리돼요. 작품마다
            작업공간이 따로라 자료가 섞이지 않아요.
          </p>
          <ul className={styles.kinds} aria-label="문서 종류">
            {DOCUMENT_TYPES.map((type) => (
              <li key={type}>
                <i
                  style={{
                    background: `var(--lk-${DOCUMENT_TYPE_META[type].nodeColor})`,
                  }}
                />
                <Icon name={DOCUMENT_TYPE_META[type].entityIcon} size={14} />
                {DOCUMENT_TYPE_META[type].label}
              </li>
            ))}
          </ul>
          <ul className={styles.points}>
            <Point icon="panel-right" title="분할 보기">
              원고를 쓰면서 옆에 인물·세계관 문서를 열어 둬요.
            </Point>
            <Point icon="star" title="즐겨찾기와 휴지통">
              자주 여는 문서는 위에 두고, 지운 문서는 원래 자리로 되돌려요.
            </Point>
          </ul>
        </Chapter>

        <Chapter
          layout="windowRight"
          title={"이름을 적는 것과\n잇는 것은 달라요"}
          aside={
            <SceneFrame
              scene="relations"
              className={styles.chapterFrame}
              label="캐릭터 문서 레나 아르벨의 속성 표. 관련 장소에 북쪽 온실 칩이 새로 붙는다."
            />
          }
        >
          <p className={styles.body}>
            레나 아르벨의 속성 표에서 관련 장소로 북쪽 온실을 고르면 그때 관계가
            생겨요. 본문에 같은 단어가 나온다고 저절로 이어지지 않아서, 작가가
            확정한 것만 남아요.
          </p>
          <ul className={styles.points}>
            <Point icon="message-square" title="관계마다 설명">
              칩에 &ldquo;첫 등장&rdquo;, &ldquo;고향&rdquo; 같은 설명을 붙여
              둬요.
            </Point>
          </ul>
        </Chapter>

        <Chapter
          layout="wide"
          title={"이어진 문서만\n밝아져요"}
          aside={
            <SceneFrame
              scene="graph"
              className={styles.wideFrame}
              label="관계 그래프. 레나 아르벨과 바로 이어진 원고, 장소, 조직만 밝게 보인다."
            />
          }
        >
          <p className={styles.body}>
            문서는 노드, 관계는 선이 돼요. 레나를 고르면 바로 이어진 원고와
            장소, 조직만 드러나고, 에피소드 범위와 문서 종류로 걸러 볼 수
            있어요.
          </p>
        </Chapter>

        <Chapter
          layout="windowLate"
          title={"누가 몇 화에\n나왔는지 한 줄로"}
          aside={
            <SceneFrame
              scene="timeline"
              className={styles.chapterFrame}
              label="회차 타임라인. 회차가 열, 설정 문서가 행이고 이어진 회차가 막대로 그려진다."
            />
          }
        >
          <p className={styles.body}>
            회차를 열로, 설정 문서를 행으로 놓고 이어진 회차를 막대로 그려요.
            막대가 끊긴 자리가 그 인물을 오래 잊고 있던 회차예요.
          </p>
        </Chapter>

        <section
          id="refresh"
          className={styles.refresh}
          aria-labelledby="refresh-title"
        >
          <div className={styles.refreshCopy}>
            <h2 id="refresh-title" className={styles.h2}>
              새 회차를 쓰면
              <br />
              AI가 바뀐 설정을 찾아요
            </h2>
            <p className={styles.status}>
              <Icon name="clock-3" size={14} />
              지금 만들고 있는 기능이에요
            </p>
            <p className={styles.body}>
              AI가 새로 쓴 원고를 읽고, 그 회차 때문에 달라져야 할 설정 문서의
              갱신안을 만들어요. 고치는 건 설정 문서뿐이고 원고는 그대로예요.
            </p>
          </div>
          <SceneFrame
            scene="refresh"
            focus={[432, 976]}
            className={styles.refreshFrame}
            label="그래프 최신화의 변경 사항 창. 레나 아르벨의 현재 버전과 신규 버전이 나란히 놓이고, 바뀐 설명과 관련 장소가 표시된다."
          />
          <ol className={styles.steps}>
            <li>
              <b>그래프 최신화를 눌러요</b>
              AI가 새 원고를 읽는 동안에도 계속 쓸 수 있어요.
            </li>
            <li>
              <b>현재 버전과 신규 버전을 나란히 봐요</b>
              바뀐 문서 목록과 속성·본문의 차이를 한 화면에서 봐요.
            </li>
            <li>
              <b>항목마다 골라 반영해요</b>
              고르기 전에는 실제 문서가 바뀌지 않아요.
            </li>
          </ol>
        </section>

        <section className={styles.more} aria-labelledby="more-title">
          <h2 id="more-title" className={styles.h3}>
            그 밖에, 쓰는 데 필요한 것들
          </h2>
          <ul className={styles.moreList}>
            <Point icon="panels-top-left" title="작업공간이 그대로">
              프로젝트를 다시 열면 열어 둔 탭과 패널 배치가 돌아와요.
            </Point>
            <Point icon="sun-moon" title="밝은 화면, 어두운 화면">
              밤에 쓰는 날엔 어두운 테마로 바꿔요.
            </Point>
            <Point icon="book-open" title="예시 프로젝트">
              「유리 정원의 기록」으로 먼저 눌러 보고 시작해요.
            </Point>
            <Point icon="sparkles" title="작품을 아는 AI 챗">
              작품 자료를 바탕으로 묻고 답하는 대화예요. 지금 만들고 있어요.
            </Point>
          </ul>
        </section>

        <section className={styles.closing} aria-labelledby="closing-title">
          <h2 id="closing-title" className={styles.h2}>
            첫 회차부터
            <br />
            이어 써 보세요
          </h2>
          <p className={styles.body}>
            Google 계정 하나면 바로 시작해요. 처음 들어오면 예시 프로젝트로 지금
            본 화면을 직접 눌러 볼 수 있어요.
          </p>
          <div className={styles.ctaRow}>
            <StartButton />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
