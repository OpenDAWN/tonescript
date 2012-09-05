# tonescript

## What is tonescript:

# [this is tonescript.](https://en.wikipedia.org/wiki/ToneScript)

## example:

```js
var toneScript = require('tonescript');

toneScript('985@-16,1428@-16,1777@-16;20(.380/0/1,.380/0/2,.380/0/3,0/4/0)').play();
```

## API

```js
var toneScript = require('tonescript');
```

```js
toneScript(script, A0);
```

toneScript returns a [baudio](https://github.com/substack/baudio) object. Use the `A0` parameter to adjust volume. Defaults to `0.2`. See [this article](https://en.wikipedia.org/wiki/Decibel) for more on what this number actually means.

```js
toneScript.toneGenerator(script, A0)
```

toneGenerator returns a function (t) {}, where t is in seconds, which returns A(t) with sin wave generators.

```js
toneScript.parse(script)
```

This will return an object representing the tones specified in your tonescript. This is used by the toneGenerator and by the baudio player to generate tones.

## license

MIT/X11.
