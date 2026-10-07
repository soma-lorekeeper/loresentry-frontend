# CloudFront 배포 설정

프론트는 한국어판과 영어판을 따로 export 해 같은 버킷의 `/ko/`, `/en/` 아래에 올린다(CI 가
`pnpm build:locales` 로 만들고 올린다). 언어 없는 주소로 들어온 요청은 CloudFront Function
(`cloudfront-rewrite.js`)이 보는 사람에 맞는 판으로 돌린다.

| 순서 | 무엇을 보나 | 결과 |
| --- | --- | --- |
| 1 | `ls_locale` 쿠키 | 사용자가 고른 언어, 로그인한 계정의 언어 |
| 2 | `CloudFront-Viewer-Country` | `KR` 이면 한국어, 그 밖은 영어 |
| 3 | `Accept-Language` | 나라를 모를 때만. 첫 언어가 `ko` 면 한국어 |
| 4 | — | 영어 |

`/ko/...`, `/en/...` 처럼 언어를 붙인 주소는 그 판을 그대로 준다. 검색엔진에 알리는 언어별 주소다.

버킷 맨 위(언어 없는 경로)에도 한국어판이 남는다. 함수를 바꾸기 전까지는 이것이 서빙되고, 사용자 지정
오류 페이지(`/404.html`)도 여기서 찾는다.

## 콘솔에서 한 번 해야 하는 일

CI 역할은 버킷 동기화와 캐시 무효화만 할 수 있다. 아래 두 가지는 계정 관리자가 한다.

### 1. 나라 헤더를 함수에 넘기기

`CloudFront-Viewer-Country` 는 배포의 정책에 넣어야 함수에 들어온다. 캐시 키에 넣으면 나라마다 캐시가
갈라지므로 **origin request policy** 에 넣는다.

1. CloudFront → Policies → Origin request → Create
   - Headers: `CloudFront-Viewer-Country` 포함. 지금 기본 동작에 연결된 origin request policy 가
     있으면 그 설정을 그대로 옮기고 이 헤더만 더한다.
   - Query strings, Cookies: 기존과 같게.
2. 배포 `E3L6QXQGVEJTYQ` → Behaviors → Default(*) → Origin request policy 를 새 정책으로 바꾼다.

이 단계를 빼먹어도 동작은 한다. 함수가 나라를 몰라 `Accept-Language` 로 고를 뿐이다.

### 2. 함수 바꾸기

**`/ko/` 와 `/en/` 이 버킷에 올라간 뒤에** 한다. 먼저 하면 언어 경로에 파일이 없어 404 가 난다.

```bash
FN=<함수 이름>   # 배포의 Viewer request 에 연결된 CloudFront Function
ETAG=$(aws cloudfront describe-function --name "$FN" --query ETag --output text)
aws cloudfront update-function --name "$FN" --if-match "$ETAG" \
  --function-config Comment="locale routing",Runtime=cloudfront-js-2.0 \
  --function-code fileb://docs/deploy/cloudfront-rewrite.js
ETAG=$(aws cloudfront describe-function --name "$FN" --query ETag --output text)
aws cloudfront test-function --name "$FN" --if-match "$ETAG" --stage DEVELOPMENT \
  --event-object '{"version":"1.0","context":{"eventType":"viewer-request"},"viewer":{"ip":"1.2.3.4"},"request":{"method":"GET","uri":"/projects/","headers":{"host":{"value":"loresentry.com"},"cloudfront-viewer-country":{"value":"US"}},"cookies":{},"querystring":{}}}'
aws cloudfront publish-function --name "$FN" --if-match "$ETAG"
```

`test-function` 결과의 `request.uri` 가 `/en/projects/index.html` 이면 된다.

## 확인

```bash
curl -s https://loresentry.com/ -H 'Cookie: ls_locale=en' | grep -o '<html lang="[a-z]*"'   # en
curl -s https://loresentry.com/ -H 'Cookie: ls_locale=ko' | grep -o '<html lang="[a-z]*"'   # ko
curl -s https://loresentry.com/en/ | grep -o '<html lang="[a-z]*"'                          # en
```

로컬에서는 `pnpm build:locales` 뒤 `COUNTRY=US pnpm serve:locales` 로 같은 함수를 거친 결과를 본다.
