# repo-checker

Generally WIP, but currently there is a `eslint-repo` script which you can use like so:

```
$ npm install -g repo-checker
$ eslint-repo <your-repo>
```

Additionally you can pass `-v` (verbose mode) for some progress updates, and with `-c` you can specify an npm project to act as the base config. The default base config is `eslint-config-airbnb`.
