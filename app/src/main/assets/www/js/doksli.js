  // ── Doksli images — defined FIRST so render() can use them safely ──
  (function() {
    var _imgs = ["./images/theme/doksli/01.jpg",
    "./images/theme/doksli/02.jpg",
    "./images/theme/doksli/03.jpg",
    "./images/theme/doksli/04.jpg",
    "./images/theme/doksli/05.jpg",
    "./images/theme/doksli/06.jpg",
    "./images/theme/doksli/07.jpg",
    "./images/theme/doksli/08.jpg",
    "./images/theme/doksli/09.jpg",
    "./images/theme/doksli/10.jpg",
    "./images/theme/doksli/11.jpg",
    "./images/theme/doksli/12.jpg",
    "./images/theme/doksli/13.jpg",
    "./images/theme/doksli/14.jpg",
    "./images/theme/doksli/15.jpg",
    "./images/theme/doksli/16.jpg",
    "./images/theme/doksli/17.jpg",
    "./images/theme/doksli/18.jpg",
    "./images/theme/doksli/19.jpg",
    "./images/theme/doksli/20.jpg",
    "./images/theme/doksli/21.jpg",
    "./images/theme/doksli/22.jpg",
    "./images/theme/doksli/23.jpg",
    "./images/theme/doksli/24.jpg",
    "./images/theme/doksli/25.jpg",
    "./images/theme/doksli/26.jpg",
    "./images/theme/doksli/27.jpg",
    "./images/theme/doksli/28.jpg",
    "./images/theme/doksli/29.jpg",
    "./images/theme/doksli/30.jpg",
    "./images/theme/doksli/31.jpg",
    "./images/theme/doksli/32.jpg",
    "./images/theme/doksli/33.jpg",
    "./images/theme/doksli/34.jpg",
    "./images/theme/doksli/35.jpg",
    "./images/theme/doksli/36.jpg",
    "./images/theme/doksli/37.jpg",
    "./images/theme/doksli/38.jpg",
    "./images/theme/doksli/39.jpg",
    "./images/theme/doksli/40.jpg"];
    var _idx = Math.floor(Math.random() * _imgs.length);
    window._dkImg = function() {
      const pool = { koceng: ["k", 123], capy: ["c", 90] };
      for (const t in pool) if (document.body.classList.contains(t)) {
        const n = pool[t][1], prev = window._kcLast;
        let i; do { i = 1 + Math.floor(Math.random() * n); } while (i === prev);
        window._kcLast = i;
        return "./images/theme/" + t + "/" + pool[t][0] + String(i).padStart(3, "0") + ".webp";
      }
      _idx = (_idx + 1) % _imgs.length;
      return _imgs[_idx];
    };
    window._dkOn = function() { return document.body.classList.contains("doksli") || document.body.classList.contains("koceng") || document.body.classList.contains("capy"); };
  })();
