This repo runs a daily cronjob to:

- fetch [ky](https://npmjs.com/ky)
- rebuild it to include commonjs and esm support
- republish it as [@smeijer/ky](https://npmjs.com/@smeijer/ky)

I wish it wasn't necessary, but Sindre isn't going to add commonjs support, and
for me, it's undesired to try to convince (enterprise) customers that they really
MUST move to ESM or can't use my libs.

Check the [original](https://npmjs.com/ky) for docs. The code and thereby functionality is identical.
