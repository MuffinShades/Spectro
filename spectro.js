//convert spectrometer thing into sheet music :D
window.addEventListener('load', function(e) {
    document.getElementById('g').addEventListener('input', function() {
        const f = this.files[0];
        console.log(f);
        if (f) {
            const r = new FileReader();
            r.addEventListener('load', function(e) {
                console.log('Fload!');
                const i = new Image();
                i.addEventListener('load', function() {
                    const c = document.getElementById('c');
                    c.width = this.width;
                    c.height = this.height;
                    const ctx = c.getContext('2d');
                    ctx.drawImage(this,0,0,c.width,c.height);
                    its(this.width,this.height,c,ctx);
                })
                i.src=e.target.result;
            });
            r.readAsDataURL(f);
        } else {
            console.error("Failed to load file!");
        }
    });
})

const N = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function freqToNote(freq) {
    const prec = 1e3;
    const Ri = 1 / 16.351, Lai = 1 / Math.log(Math.pow(2, 1/12));
    const sfc0 = Math.floor(Math.log(freq * Ri) * Lai * prec) / prec;
    const k = Math.floor(sfc0);
    return N[Math.floor(k % 12)] + Math.floor(k / 12);
}

function freqToStep(freq) {
    const prec = 1e3;
    const Ri = 1 / 16.351, Lai = 1 / Math.log(Math.pow(2, 1/12));
    return Math.floor(Math.log(freq * Ri) * Lai * prec) / prec;
}

function stepToFreq(n) {
    const prec = 1e3;
    const r = 16.351, A = Math.pow(2, 1/12);
    return Math.floor(r * Math.pow(A, n) * prec) / prec;
}

function freqToNoteInfo(freq) {
    const prec = 1e3;
    const Ri = 1 / 16.351, Lai = 1 / Math.log(Math.pow(2, 1/12));
    const sfc0 = Math.floor(Math.log(freq * Ri) * Lai * prec) / prec;
    const k = Math.floor(sfc0);
    return {name: N[Math.floor(k % 12)] + Math.floor(k / 12), step: k};
}

function getStepSize(freq) {
    const prec = 1e3;
    const R = 16.351, Ri = 1 / R, A = Math.pow(2, 1/12), Lai = 1 / Math.log(A), Tau = Math.log(A);
    const sfc0 = Math.floor(Math.log(freq * Ri) * Lai * prec) / prec;
    const k = Math.floor(sfc0);
    return R*Tau*Math.pow(A, k);
}

var audioCtx = new(window.AudioContext || window.webkitAudioContext)();

//from https://stackoverflow.com/questions/39200994/how-to-play-a-specific-frequency-with-javascript
function playNote(freq, dur, vol) {
    
    // create Oscillator node
    var oscillator = audioCtx.createOscillator();

    oscillator.type = 'square';
    console.log(freq, vol);
    var gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.gain.value = vol;
    oscillator.frequency.value = freq; // value in hertz
    oscillator.connect(audioCtx.destination);
    oscillator.start();

    setTimeout(function() {
        oscillator.stop();
    },dur);
}

function grayScaleRDecode(val) {
    /*var min = 0;
    var max = 1;
    var idx = -1, inf = {};

    for (;max < grad.length;max++) {
        const g0 = grad[min], g1 = grad[max],
              gm = Math.min(g0[0],g1[0]), gx = Math.max(g0[0],g1[0]);

        if (
            val[0] >= gm[0] && val[0] < gx[0] &&
        ) {
            idx = min;
            inf.gm = gm;
            inf.gx = gx;
            inf.g0 = g0;
            break;
        }

        min++;
    }

    if (idx < 0) {
        const e = grad[grad.length-1];
        if (val[0] == e[0] && val[1] == e[1] && val[2] == e[2])
            return 1;
        console.warn('Could not find graident!',val);
        return 0;
    }

    var base = min / grad.length;

    //TODO: this probably doesnt work if g1 < g0
    return base + (val[0] - inf.gm[0]) / (inf.gx - val[0]);*/

    return val[0] / 255;
}

function meterStrDecode() {

}

const SpecGrad = [
    [0,0,0],
    [255,255,255]
];

function XtoI(idat, x, w, h) {
    var I = [];

    for (var i = 0; i < h; i++) {
        const p = (x + (w * i)) << 2;
        I[i] = grayScaleRDecode(
            [
            idat[p+0],
            idat[p+1],
            idat[p+2]]
        );
    }
    //console.log(I);
    return I;
}

//calculates prominence and volume
//TODO: make this algorithm better; better prominence analysis; and calculate volume based off of (I / max) instead of prominence
function CalcPeakPromVol(pk) {
    /*var max = pk[0].I;

    for (var i = 1; i < pk.length; i++) {
       max = Math.max(pk[i].I,max);
    }

    for (var i = 0; i < pk.length; i++) {
        pk[i].prom = pk[i].I / max;
        pk[i].vol = 0.7;
    }*/

    //console.log(pk);

    //TODO: compare on x-axis to get rid of a note once is has been played and is starting to degrade
    //check % degrade between steps and if its >= like 2% then just ignore
    //it should be linear so as the note degrades speed will %- >= 2% consistently
    //TODO: also if it isnt degrading then create a long / held note
    /*for (var i = 0; i < pk.length; i++) {
        var g = 0;

        const issz = 1.0 / getStepSize(pk[i].freq);
        var coeff = 1;

        //neigbor comparision
        if (i > 0) {
            const dy = Math.abs(pk[i-1].y - pk[i].y), df = Math.abs(pk[i-1].freq - pk[i].freq);
            if (pk[i-1].I < pk[i].I) {
                var mod = ((df * issz));
                coeff = Math.min(mod, coeff);
                pk[i].prom += 0.3 * (mod * Math.abs(pk[i-1].I / pk[i].I - 1)) * 2;
                g++;
            }
        }

        if (i < pk.length - 1) {
            const dy = Math.abs(pk[i+1].y - pk[i].y), df = Math.abs(pk[i+1].freq - pk[i].freq);
            if (pk[i+1].I < pk[i].I) {
                var mod = ((df * issz));
                coeff = Math.min(mod, coeff);
                pk[i].prom += 0.3 * (mod * Math.abs(pk[i+1].I / pk[i].I - 1)) * 2;
                g++;
            }
        }
        

        pk[i].prom += Math.floor(g * 0.5) * 0.5 * coeff;
        pk[i].prom += pk[i].I * 0.5;
    }*/

    for (var i = 0; i < pk.length; i++) {

    }

    //flat everything to between 0.0 and 1.0
    var max = pk[0].prom;

    for (var i = 1; i < pk.length; i++) {
       max = Math.max(pk[i].prom,max);
    }

    const iMax = 1 / max;

    for (var i = 0; i < pk.length; i++) {
        //console.log(pk[i].prom, max);
        pk[i].prom = pk[i].prom / max;
        pk[i].vol = 1;
    }

    return pk;
}

//basically averages out the I values
function ExtractPianoNoteProm(I, fMin, fRange, sMin, sRange) {
    if (!sMin) sMin = fMin;
    if (!sRange) sRange = fRange;

    const sMax = sMin + sRange;

    var notes = [];

    const F = fRange / I.length,
          fStart = Math.max(0,(sMin - fMin) * F), fEnd = Math.min(I.length, ((sMin - fMin) + sRange) * F);

    for (var i = sMin; i < sMax;) {
        const s = freqToStep(i),
              dFreq = stepToFreq(s+1) - i;

        var sum = 0;

        for (var j = 0; j < dFreq; j++) {
            sum += I[Math.floor((i+j)*F)] || 0;
        }

        //console.log(s,dFreq,i,sum);

        notes.push({
            prom: sum / dFreq,
            freq: i,
            i:i,
            vol: 1.0,
            step: s
        });

        i += Math.max(dFreq,1);
    }

    //convert to between 0.0 and 1.0
    var max = notes[0].prom;

    for (var i = 1; i < notes.length; i++)
        max = Math.max(notes[i].prom, max);

    for (var i = 0; i < notes.length; i++) {
        notes[i].prom /= max;
        if (notes[i].prom > 0) console.log(notes[i].prom);
    }

    return notes;
}

function ExtractPeaks(I, fMin, fRange, sMin, sRange) {
    if (!sMin) sMin = fMin;
    if (!sRange) sRange = fRange;


    var peaks = [];

    var cmp = I[0];

    const F = fRange / I.length;

    const fStart = Math.max(0,(sMin - fMin) * F), fEnd = Math.min(I.length, ((sMin - fMin) + sRange) * F);

    for (var i = fStart+1; i < fEnd; i++) {
        const y = I.length - i - 1; //flip y-axis
        if (I[i] < cmp)
            peaks.push({
                freq: fMin + F * y,
                y: y,
                i: i,
                I: I[i],
                prom: 0.0,
                vol:  1.0
            });
        cmp = I[i];
    }

    if (peaks.length == 0)
        peaks.push(I[0])

    return CalcPeakPromVol(peaks);
}

function removeDuplicates(arr) {
    var e = [];

    for (var i= 0 ; i < arr.length; i++) {
        var v = true;
        for (var j = 0; j < e.length; j++) {
            if (arr[i] == e[j]) {
                v = false;
                break;
            }
        }

        if (v)
            e.push(arr[i]);
    }

    return e;
}

//sMin - selector min
//sRange - selector range
function ExtractColNotes(idat, x, w, h, fMin, fRange, sMin, sRange) {
    var chord = [];

    const I = XtoI(idat, x, w, h);
    //const pk = ExtractPeaks(I,fMin,fRange,sMin,sRange);
    const pk = ExtractPianoNoteProm(I,fMin,fRange,sMin,sRange);
    
    const pkThresh = 0.90;

    for (var p of pk) {
        if (p.prom >= pkThresh)
            chord.push({nInf: freqToNoteInfo(p.freq), freq: p.freq, vol: p.vol});
        
    }

    return removeDuplicates(chord);
}

function ExtractNotes(idat, w, h) {
    var notes = [];
}

function its(w, h, ican, ictx) {
    const dur = parseInt(prompt("Enter Duration in Seconds"));
    const bpm = parseInt(prompt("Enter BPM"));
    const meter = prompt("Enter Meter");

    const fMin = 20, fMax = 1e3 * 20, fRange = fMax - fMin;
    const res = fRange / h;

    const idat = ictx.getImageData(0,0,w,h);

    console.log(res);

    var noteData = [];

    noteData = removeDuplicates(noteData);

    const can = document.getElementById('plot');
    const ctx = can.getContext('2d');


    const dx = 20, sMin = 8, sMax = 96, sRange = sMax - sMin, dy = 25;

    can.width = dx * w;
    can.height = dy * 96;

    var last = [], len = 1;

    //
    // THIS IS AT 1 SO IT WILL ONLY SCAN FIRST LINE!!!
    // CHANGE TO "w" TO SCAN WHOLE SPECTROGRAM
    //
    for (var x = 0; x < w; x ++) {
        var d, s;
        noteData.push(d = ExtractColNotes(idat.data, x, w, h, fMin, fRange, sMin, sRange));
        //console.log(last,d);

        var diff = last.length == 0;

        for (var i = 0; (i < last.length && i < d.length); i++) {
            if (last[i].nInf.step != d[i].nInf.step) {
                diff = true;
                break;
            }
        }

        if (diff) {
            for (var i  = 0; i < last.length; i++){
                s = last[i].nInf.step;
                if (s > sMax) continue;
                ctx.fillStyle = '#00f';
                ctx.fillRect(x * dx, s * dy, dx * len, dy);
                ctx.fillStyle = '#000';
                ctx.fillText(last[i].nInf.name, x * dx, s * dy);
            }

            last = d;
            len = 1;
        } else {
            len++;
        }

        ctx.beginPath();
        ctx.moveTo(x*dx,0);
        ctx.lineTo(x*dx,can.height);
        ctx.stroke();
    }

    //play thingy
    var i = 0;
    setInterval(function() {
        if (i < noteData.length) {
            var nts = noteData[i++];
            for (var n of nts) {
                //playNote(n.freq, 100, 0.01);
            }
        }
    },100);
}