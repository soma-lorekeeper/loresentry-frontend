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

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (uri.lastIndexOf('.') < uri.lastIndexOf('/')) {
    request.uri = uri + '/index.html';
  }

  return request;
}
