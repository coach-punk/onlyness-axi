// src/surface/narrator.ts
// Dry, deep-voiced British documentary narrator (Web Speech API + live captions).

export const NARRATOR_SCRIPTS = {
  paradox_intro:
    "Observe the marketplace in its natural state. Every competitor insists they taste slightly sweeter. Yet when the blindfold comes off, people reach for the brand they already know.",
  paradox_blind:
    "Blindfolded, the palate prefers the challenger. Fifty-seven percent choose Pepsi. On paper, the race is won.",
  paradox_branded:
    "Remove the blindfold, and preference flips to sixty-five percent Coca-Cola. Better on the scoreboard rarely wins the room.",
  arena_intro:
    "Before we sharpen the knife, let us map the terrain. Name the arena, what you actually offer, and the specific human who buys it.",
  stand_intro:
    "Ignore your feature list for a moment. Who hurts today, what job are they hiring for, and what does solved look like in their kitchen?",
  axis_intro:
    "Behold the Axis of Better. Drop your rivals along this line, then place yourself. Watch closely as everyone crowds toward the exact same corner.",
  axis_crowded:
    "How delightfully crowded. You have parked yourself three pixels away from a rival who sounds remarkably like you.",
  off_axis_intro:
    "Now for the leap. Leave the horizontal race entirely. Grab your marker and pull it upwards into uncontested territory.",
  off_axis_lifted:
    "Remarkable. Up here in thin air, the Brad Pitts of your category remain stubbornly glued to the floor below.",
  off_axis_low:
    "You are still hovering suspiciously close to the floor. A rival could adopt that nuance before luncheon.",
  onlyness_intro:
    "Time for the sentence. Fill the frame: who you are the only one of, and the paradigm shift no competitor can say with a straight face.",
  onlyness_lint_warn:
    "Careful now. The rubric detects familiar axis-of-better phrasing. Any polite rival could borrow that adjective.",
  onlyness_brad_pitt:
    "Listen closely when a generic competitor reads your own claim aloud. Does the room laugh, or nod politely and forget it?",
  truthmode_intro:
    "Enter truthmode. We test the claim against the rubric, hand it to an imaginary rival, and ask what you are brave enough to cut.",
  truthmode_fail:
    "A noble draft, yet it breaks under pressure. Step back to off-axis or rewrite the statement before calling it finished.",
  truthmode_pass:
    "The claim survives the swap. Rivals cannot speak those words without sounding utterly ridiculous.",
  pitch_intro:
    "Read each piece once more with cold eyes. Confirm satisfaction only when you could defend every line in a crowded room.",
  pitch_open:
    "And here is the philosophy distilled. Open with the onlyness, trace the four beats in reverse, and close where you began.",
  chill:
    "You are permitted to stop. Put the kettle on, step away from the desk, and return when your head is clear.",
  done:
    "The workshop rests complete. Everything that remains is execution, and the courage to leave the wrong features uncut.",
} as const;

export type NarratorCue = keyof typeof NARRATOR_SCRIPTS;

/** Browser script driving Web Speech API (deep en-GB voice) + caption bar. */
export function narratorClientScript(): string {
  return `(function () {
  var AUDIO_KEY = "onlyness_narrator_audio";
  var VOICE_KEY = "onlyness_narrator_voice";
  var synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
  var enabled = false;
  try {
    enabled = localStorage.getItem(AUDIO_KEY) === "1";
  } catch (e) { enabled = false; }

  var selectedUri = "";
  try {
    selectedUri = localStorage.getItem(VOICE_KEY) || "";
  } catch (e) { selectedUri = ""; }

  var lastText = "";
  var PREFERRED = ["daniel", "arthur", "oliver", "george", "ryan", "uk english male", "serena", "martha", "kate"];

  function scoreVoice(v) {
    var lang = (v.lang || "").toLowerCase();
    var name = (v.name || "").toLowerCase();
    var score = 0;
    if (lang === "en-gb" || lang === "en_gb") score += 100;
    else if (lang.startsWith("en-au") || lang.startsWith("en-nz") || lang.startsWith("en-ie")) score += 45;
    else if (lang.startsWith("en")) score += 20;
    for (var i = 0; i < PREFERRED.length; i++) {
      if (name.indexOf(PREFERRED[i]) >= 0) {
        score += 60 - i * 4;
        break;
      }
    }
    if (name.indexOf("male") >= 0) score += 25;
    if (v.localService) score += 10;
    return score;
  }

  function listVoices() {
    if (!synth) return [];
    var all = synth.getVoices() || [];
    return all.slice().sort(function (a, b) {
      return scoreVoice(b) - scoreVoice(a);
    });
  }

  function pickVoice() {
    var voices = listVoices();
    if (!voices.length) return null;
    if (selectedUri) {
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].voiceURI === selectedUri) return voices[i];
      }
    }
    return voices[0];
  }

  function populateSelect() {
    var sel = document.getElementById("narrator-voice-select");
    if (!sel) return;
    var voices = listVoices();
    if (!voices.length) {
      sel.innerHTML = '<option value="">Browser speech unavailable (captions active)</option>';
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    var active = pickVoice();
    sel.innerHTML = "";
    voices.slice(0, 18).forEach(function (v) {
      var opt = document.createElement("option");
      opt.value = v.voiceURI;
      opt.textContent = v.name + " (" + v.lang + ")";
      if (active && v.voiceURI === active.voiceURI) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function updateToggleUi() {
    var btn = document.getElementById("narrator-toggle");
    if (!btn) return;
    btn.setAttribute("aria-pressed", enabled ? "true" : "false");
    var label = btn.querySelector("[data-label]");
    if (label) label.textContent = enabled ? "Voice on" : "Voice off";
    else btn.textContent = enabled ? "Voice on" : "Voice off";
  }

  function setCaption(text) {
    var el = document.getElementById("narrator-line");
    if (el && text) el.textContent = text;
  }

  function speakNow(text) {
    if (!text) return;
    lastText = text;
    setCaption(text);
    if (!enabled || !synth) return;
    try {
      synth.cancel();
      var utt = new SpeechSynthesisUtterance(text);
      var voice = pickVoice();
      if (voice) {
        utt.voice = voice;
        utt.lang = voice.lang || "en-GB";
      } else {
        utt.lang = "en-GB";
      }
      utt.pitch = 0.86;
      utt.rate = 0.93;
      synth.speak(utt);
    } catch (e) { /* Ignore speech blocked errors gracefully */ }
  }

  function bindControls() {
    populateSelect();
    updateToggleUi();
    var toggle = document.getElementById("narrator-toggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        enabled = !enabled;
        try { localStorage.setItem(AUDIO_KEY, enabled ? "1" : "0"); } catch (e) {}
        updateToggleUi();
        if (enabled) {
          var current = lastText || (document.getElementById("narrator-line") || {}).textContent || "";
          if (current) speakNow(current);
        } else if (synth) {
          try { synth.cancel(); } catch (e) {}
        }
      });
    }
    var replay = document.getElementById("narrator-replay");
    if (replay) {
      replay.addEventListener("click", function () {
        var current = lastText || (document.getElementById("narrator-line") || {}).textContent || "";
        if (!current) return;
        enabled = true;
        try { localStorage.setItem(AUDIO_KEY, "1"); } catch (e) {}
        updateToggleUi();
        speakNow(current);
      });
    }
    var sel = document.getElementById("narrator-voice-select");
    if (sel) {
      sel.addEventListener("change", function () {
        selectedUri = sel.value || "";
        try { localStorage.setItem(VOICE_KEY, selectedUri); } catch (e) {}
        if (enabled && lastText) speakNow(lastText);
      });
    }
  }

  if (synth && typeof synth.addEventListener === "function") {
    synth.addEventListener("voiceschanged", populateSelect);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindControls);
  } else {
    bindControls();
  }

  window.OnlynessNarrator = {
    say: function (text) { speakNow(text); },
    replay: function () {
      enabled = true;
      updateToggleUi();
      speakNow(lastText || (document.getElementById("narrator-line") || {}).textContent || "");
    },
    isEnabled: function () { return enabled; },
    setVoice: function (uri) { selectedUri = uri; }
  };
})();`;
}
