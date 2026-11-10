/* Shared site links (index.html + order.html). */
var IENN_INSTAGRAM_URL = 'https://www.instagram.com/inlandempirenativenursery/';
var IENN_FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61595374847391';
(function () {
  var a = document.querySelectorAll('a.ig-link');
  for (var i = 0; i < a.length; i++) a[i].href = IENN_INSTAGRAM_URL;
  var b = document.querySelectorAll('a.fb-link');
  for (var i = 0; i < b.length; i++) b[i].href = IENN_FACEBOOK_URL;
})();
