var baudio = require('baudio');

// see: https://en.wikipedia.org/wiki/ToneScript
//
// example:
//
//     var toneScript = require('./tonescript');
//     toneScript('350@-19,440@-19;10(*/0/1+2)', 0.2).play();
//
// TODO: Repeat cadence patterns over their lifetimes. Right now when
// the cadence time is greater than that mapped to sections, the code
// throws.

module.exports = function (tone, db) {
  return baudio(toneGenerator(tone), db);
}
exports.toneGenerator = toneGenerator;
exports.parse = toneScript;


// parse up cadence sections
function cadScript(script) {
  var cads = script.split(';');

  return cads.map(function (cad) {
    if (cad.length === 0) {
      return;
    }
    var matchParens = cad.match(/\([0-9\/\.,\*\+]*\)$/),
        ringLength = cad.substring(0, matchParens.index),
        segments = matchParens.pop();

    if (matchParens.length) {
      throw new Error(
        'cadence script should be of the form `%f(%f/%f[,%f/%f])`'
      );
    }

    ringLength = (ringLength === '*') ? Infinity : parseFloat(ringLength);

    if (isNaN(ringLength)) {
      throw new Error('cadence length should be of the form `%f`');
    }

    segments = segments
      .slice(1, segments.length - 1)
      .split(',')
      .map(function (segment) {
        try {
          var onOff = segment
            .split('/')
          ;
          if (onOff.length > 3) {
            throw new Error();
          }
          onOff = onOff.map(function (string, i) {
            if (i === 2) {
              // Special rules for frequencies
              var freqs = string
                .split('+')
                .map(function (f) {
                  var int = parseInt(f, 10);
                  if (isNaN(int)) {
                    throw new Error();
                  }
                  return int - 1;
                })
              ;
              return freqs;
            }

            var float;
            // Special rules for Infinity;
            if (string == '*') {
              float = Infinity;
            }
            float = float ? float : parseFloat(string, 10);
            if (isNaN(float)) {
              throw new Error();
            }
            return float;
          });

          return {
            on: onOff[0],
            off: onOff[1],
            // frequency is an extension for full toneScript.
            frequencies: onOff[2]
          };
        }
        catch (err) {
          throw new Error(
            'cadence segments should be of the form `%f/%f[%d[+%d]]`'
          );
        }
      })
    ;

    return {
      duration: ringLength,
      sections: segments
    };
  });
};

// parse up frequency sections
function freqScript(script) {
  var freqs = script.split(',');
  return freqs.map(function (freq) {
    try {
		  var tonePair = freq.split('@'),
		      frequency = parseInt(tonePair.shift()),
		      dB = parseFloat(tonePair.shift());

		  if (tonePair.length) {
		    throw Error();
		  }

      return {
        frequency: frequency,
        decibels: dB
      };
    }
    catch (err) {
      throw new Error(
        'freqScript pairs are expected to be of the form `%d@%f[,%d@%f]`'
      );
    }
  });
};

// parse up full scripts
function toneScript(script) {
  var sections = script.split(';'),
      frequencies = freqScript(sections.shift()),
      cadences = cadScript(sections.join(';'));

  return {
    frequencies: frequencies,
    cadences: cadences
  };
}

function toneGenerator(script, unitAmplitude) {
  var tone = toneScript(script);

  if (!unitAmplitude) {
    unitAmplitude = 0.2;
  }

  // figure out the time when each cadence starts
  var cadStarts = tone.cadences.reduce(function (acc, cad) {
    return acc.concat(acc[acc.length - 1] + cad.duration);
  }, [0]);

  return function (t) {
    // Figure out which cadence we're in and
    // how far into it we are.
    var cadTime,
        thisCad;

    cadStarts.some(function (s, i) {
      if (t >= s) {
        cadTime = t - s;
        thisCad = tone.cadences[i];
        return true;
      };
      return false;
    });

    // Find the section starts, relative to the start of this cadence.
    var sectStarts = thisCad
          .sections
          .reduce(function (acc, section) {
            return acc.concat(
              acc[acc.length - 1] +
              section.on + section.off
            );
          }, [0])
        ,
        sectDuration = sectStarts[sectStarts.length - 1],
        modDuration = cadTime % sectDuration;

    // Figure out which section we're in and
    // how far into it we are.
    var sectTime,
        thisSect;

    sectStarts.some(function (s, i) {
      if (modDuration == 0) {
        // Some bizarre edge case.
        // Luckily, this simplifies things quite a bit.
        sectTime = s;
        thisSect = thisCad.sections[0];
        return true;
      }
      else if (modDuration <= s) {
        sectTime = s - (cadTime % sectDuration);
        thisSect = thisCad.sections[i - 1];
        return true;
      }
      return false;
    });

    // On or off?
    if (sectTime <= thisSect.on) {
      // which frequencies?
      var thisFreqs = thisSect.frequencies.map(function (i) {
        return tone.frequencies[i];
      });

      var lvl = 0;
      thisFreqs.forEach(function (f) {
        if (f) {
          lvl += sin(f.decibels, f.frequency, t);
        }
      });

      return lvl;

    }
    else {
      // In a silent part of the cadence.
      return 0;
    }
  };

	function sin(db, f, t) {
		return Math.pow(10, db/20) * unitAmplitude * Math.sin(2 * Math.PI * f * t);
	}
}
