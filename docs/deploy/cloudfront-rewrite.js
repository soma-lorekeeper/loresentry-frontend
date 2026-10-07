// CloudFront Function (cloudfront-js-2.0, viewer request).
//
// 버킷에는 한국어판(/ko/)과 영어판(/en/)이 따로 있다. 언어 없는 주소로 오면 보는 사람에 맞는 판으로
// 돌린다. 주소는 그대로라 링크·북마크·로그인 복귀 주소가 언어와 상관없이 같다.
//
// 언어 고르는 순서
//   1. ls_locale 쿠키 — 사용자가 고른 언어, 또는 로그인한 계정의 언어
//   2. CloudFront-Viewer-Country — 한국(KR)이면 한국어, 그 밖은 영어.
//      배포의 origin request policy 에 이 헤더가 있어야 함수에 들어온다(docs/deploy/README.md).
//   3. Accept-Language — 나라를 모를 때만. 첫 언어가 한국어면 한국어.
//   4. 영어
//
// /ko/..., /en/... 처럼 언어를 붙여 오면 그 판을 그대로 준다. 검색엔진이 언어마다 다른 주소를 갖고,
// 공유한 링크가 받는 사람의 위치와 상관없이 같은 언어로 열린다.

var LOCALES = { ko: true, en: true };

function pickLocale(request) {
  var cookie = request.cookies && request.cookies.ls_locale;
  if (cookie && LOCALES[cookie.value]) return cookie.value;
  var country = request.headers['cloudfront-viewer-country'];
  if (country && country.value) return country.value === 'KR' ? 'ko' : 'en';
  var language = request.headers['accept-language'];
  if (language && /^\s*ko\b/i.test(language.value)) return 'ko';
  return 'en';
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (request.headers.host && request.headers.host.value === 'www.loresentry.com') {
    var qs = [];
    for (var k in request.querystring) {
      var v = request.querystring[k];
      if (v.multiValue) {
        for (var i = 0; i < v.multiValue.length; i++) {
          qs.push(k + '=' + v.multiValue[i].value);
        }
      } else {
        qs.push(k + '=' + v.value);
      }
    }
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: {
          value: 'https://loresentry.com' + uri + (qs.length ? '?' + qs.join('&') : ''),
        },
      },
    };
  }

  if (!/^\/(ko|en)(\/|$)/.test(uri)) {
    uri = '/' + pickLocale(request) + uri;
  }

  if (uri.endsWith('/')) {
    uri = uri + 'index.html';
  } else if (uri.lastIndexOf('.') < uri.lastIndexOf('/')) {
    uri = uri + '/index.html';
  }

  request.uri = uri;
  return request;
}
