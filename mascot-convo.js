/* ================================================================
   NJORD — mascot conversation
   A guided, conversational project intake that opens when the mascot
   is clicked (see main.js's mascot-hit click handler). This is
   deliberately NOT a redesign of the mascot itself — ascii-engine.js
   is untouched — it's a separate real-DOM panel that appears next to
   him. The whole point is that it reads as "the little guy is asking
   about my idea," not "I'm filling out a lead form": one question at
   a time, his own voice (lowercase, informal), real inputs styled
   like the rest of the site, no fake thinking/typing delays beyond a
   restrained per-line type-in, and a plain structured data object at
   the end instead of a raw chat transcript.
   ================================================================ */
import { prefersReducedMotion } from './ascii-engine.js';
import { t, getLang } from './i18n.js';

const INTEREST_OPTIONS = [
  { value: 'website', labelKey: 'convo.s3.opt1' },
  { value: 'branding', labelKey: 'convo.s3.opt2' },
  { value: 'both', labelKey: 'convo.s3.opt3' },
  { value: 'something-else', labelKey: 'convo.s3.opt4' },
  { value: 'not-sure', labelKey: 'convo.s3.opt5' },
];

const PROBLEM_OPTIONS = [
  { value: 'starting-fresh', labelKey: 'convo.s4.opt1' },
  { value: 'replacing-outdated', labelKey: 'convo.s4.opt2' },
  { value: 'growing', labelKey: 'convo.s4.opt3' },
  { value: 'not-working', labelKey: 'convo.s4.opt4' },
  { value: 'not-sure', labelKey: 'convo.s4.opt5' },
];

const AUDIENCE_OPTIONS = [
  { value: 'everyday-customers', labelKey: 'convo.s5.opt1' },
  { value: 'other-businesses', labelKey: 'convo.s5.opt2' },
  { value: 'local-community', labelKey: 'convo.s5.opt3' },
  { value: 'niche-group', labelKey: 'convo.s5.opt4' },
  { value: 'not-sure', labelKey: 'convo.s5.opt5' },
];

// The intake flow, in order. `key` is the field name written into the
// final structured data object — see buildPayload() at the bottom,
// which mirrors this list one-to-one plus the fixed intro/contact/meta
// fields. Every step's copy lives in i18n.js under the matching
// `convo.sN.*` keys so English/Albanian share this exact same flow.
// problem/goal and audience are both choice-driven rather than free
// text, by explicit request — visitors pick, they don't write.
const STEPS = [
  { key: 'businessName', type: 'text', promptKeys: ['convo.s1.prompt'], required: true },
  { key: 'businessDescription', type: 'textarea', promptKeys: ['convo.s2.prompt'], placeholderKey: 'convo.s2.placeholder', required: true },
  { key: 'interest', type: 'choice', promptKeys: ['convo.s3.prompt'], options: INTEREST_OPTIONS, required: true },
  { key: 'problem', type: 'choice', promptKeys: ['convo.s4.prompt1', 'convo.s4.prompt2'], options: PROBLEM_OPTIONS, required: true },
  { key: 'audience', type: 'choice', promptKeys: ['convo.s5.prompt'], options: AUDIENCE_OPTIONS, required: true },
  { key: 'contact', type: 'contact', promptKeys: ['convo.s14.prompt1', 'convo.s14.prompt2'], required: true },
  { key: 'additionalNotes', type: 'textarea', promptKeys: ['convo.s15.prompt'], optional: true },
];

/** @param container the #mascot-convo element (index.html)
 *  @param opts.accessKey Web3Forms access key (see main.js) — this is
 *  now the only way to reach the studio, the old standalone contact
 *  form was removed. */
export function initMascotConvo(container, opts = {}){
  const stage = container.querySelector('.mascot-convo__stage');
  const backBtn = container.querySelector('.mascot-convo__back');
  const closeBtn = container.querySelector('.mascot-convo__close');
  const progressFill = container.querySelector('.mascot-convo__progress-fill');
  const headEl = container.closest('.contact-inner')?.querySelector('.contact-head');
  const reduced = prefersReducedMotion();

  // phase: 'closed' | 'intro' | 'flow' | 'justLooking' | 'end' | 'sent'
  let phase = 'closed';
  let stepIndex = 0;
  const answers = {};
  let startedAt = null;

  function typeInto(el, text){
    const full = document.createElement('span');
    full.className = 'mascot-convo__sr';
    full.textContent = text;
    if(reduced){
      el.textContent = text;
      return;
    }
    el.textContent = '';
    el.appendChild(full);
    const visible = document.createElement('span');
    visible.setAttribute('aria-hidden', 'true');
    el.appendChild(visible);
    const chars = Array.from(text);
    let i = 0;
    const step = () => {
      i += 1;
      visible.textContent = chars.slice(0, i).join('');
      // a mechanical-keyboard "thock" per character, like the rest of the
      // site's audio, only actually audible once sound is toggled on
      if(chars[i - 1] !== ' ') opts.onKeystroke?.();
      // 14ms/char (~70/sec) fired keystrokes faster than the ear can
      // resolve as separate hits, so they blurred into one continuous
      // buzz instead of a spaced typing rhythm — slowed to a still-brisk
      // but individually audible pace.
      if(i < chars.length) requestAnimationFrame(() => setTimeout(step, 48));
    };
    requestAnimationFrame(step);
  }

  function renderPrompt(promptKeys){
    const wrap = document.createElement('div');
    wrap.className = 'mascot-convo__prompt';
    promptKeys.forEach((key) => {
      const line = document.createElement('p');
      typeInto(line, t(key));
      wrap.appendChild(line);
    });
    return wrap;
  }

  function setProgress(fraction){
    progressFill.style.width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
  }

  function updateChrome(){
    backBtn.hidden = !(phase === 'flow' && stepIndex > 0) && phase !== 'end';
    container.querySelector('.mascot-convo__progress').hidden = phase !== 'flow' && phase !== 'end';
    if(phase === 'flow') setProgress(stepIndex / STEPS.length);
    else if(phase === 'end' || phase === 'sent') setProgress(1);
  }

  function clearStage(){ stage.replaceChildren(); }

  function focusFirst(){
    const target = stage.querySelector('input, textarea, button.mascot-convo__choice, button.mascot-convo__primary');
    if(target) target.focus({ preventScroll: true });
  }

  function renderIntro(){
    phase = 'intro';
    updateChrome();
    clearStage();
    stage.appendChild(renderPrompt(['convo.open.line1', 'convo.open.line2']));
    const choices = document.createElement('div');
    choices.className = 'mascot-convo__choices';
    const projectBtn = document.createElement('button');
    projectBtn.type = 'button';
    projectBtn.className = 'mascot-convo__choice mascot-convo__choice--primary';
    projectBtn.textContent = t('convo.open.project');
    projectBtn.addEventListener('click', () => { startedAt = new Date(); stepIndex = 0; renderStep(); });
    const lookingBtn = document.createElement('button');
    lookingBtn.type = 'button';
    lookingBtn.className = 'mascot-convo__choice';
    lookingBtn.textContent = t('convo.open.justLooking');
    lookingBtn.addEventListener('click', renderJustLooking);
    choices.append(projectBtn, lookingBtn);
    stage.appendChild(choices);
    focusFirst();
  }

  function renderJustLooking(){
    phase = 'justLooking';
    updateChrome();
    clearStage();
    stage.appendChild(renderPrompt(['convo.justLooking.reply']));
    setTimeout(close, reduced ? 900 : 1800);
  }

  function currentField(){
    return stage.querySelector('[data-field]');
  }

  function fieldHasValue(){
    const step = STEPS[stepIndex];
    if(step.type === 'contact'){
      const name = stage.querySelector('[name=convoName]');
      const email = stage.querySelector('[name=convoEmail]');
      return !!(name && name.value.trim() && email && email.value.trim());
    }
    if(step.type === 'choice') return !!answers[step.key];
    const field = currentField();
    return !!(field && field.value.trim());
  }

  function collectStepAnswer(){
    const step = STEPS[stepIndex];
    if(step.type === 'text' || step.type === 'textarea'){
      const field = currentField();
      answers[step.key] = field ? field.value.trim() : '';
    } else if(step.type === 'contact'){
      answers.contactName = stage.querySelector('[name=convoName]').value.trim();
      answers.email = stage.querySelector('[name=convoEmail]').value.trim();
      answers.phone = stage.querySelector('[name=convoPhone]').value.trim();
    }
    // 'choice' steps already write straight into `answers` on click.
  }

  function advanceStep(){
    if(stepIndex + 1 >= STEPS.length) renderEnd();
    else { stepIndex += 1; renderStep(); }
  }

  function goNext(){
    collectStepAnswer();
    advanceStep();
  }

  function goBack(){
    if(phase === 'flow' && stepIndex === 0){ renderIntro(); return; }
    if(phase === 'end'){ stepIndex = STEPS.length - 1; renderStep(); return; }
    if(phase === 'flow'){ stepIndex -= 1; renderStep(); }
  }

  function buildTextField(step, tag){
    const field = document.createElement(tag);
    field.dataset.field = step.key;
    field.name = `convo-${step.key}`;
    if(step.placeholderKey) field.placeholder = t(step.placeholderKey);
    if(tag === 'textarea') field.rows = step.large ? 4 : 3;
    if(step.important) field.classList.add('mascot-convo__field--important');
    if(answers[step.key]) field.value = Array.isArray(answers[step.key]) ? answers[step.key].join('\n') : answers[step.key];
    field.addEventListener('input', refreshPrimaryState);
    return field;
  }

  function refreshPrimaryState(){
    const primary = stage.querySelector('.mascot-convo__primary');
    if(!primary) return;
    const step = STEPS[stepIndex];
    primary.disabled = !!step.required && !fieldHasValue();
  }

  function renderFooter(step){
    const foot = document.createElement('div');
    foot.className = 'mascot-convo__foot';
    if(step.type !== 'choice'){
      const primary = document.createElement('button');
      primary.type = 'button';
      primary.className = 'mascot-convo__primary';
      primary.textContent = t('convo.continue');
      primary.disabled = !!step.required && !fieldHasValue();
      primary.addEventListener('click', goNext);
      foot.appendChild(primary);
    }
    if(step.optional){
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'mascot-convo__skip';
      skip.textContent = t('convo.skip');
      skip.addEventListener('click', () => {
        answers[step.key] = '';
        advanceStep();
      });
      foot.appendChild(skip);
    }
    return foot;
  }

  function renderStep(){
    phase = 'flow';
    updateChrome();
    clearStage();
    const step = STEPS[stepIndex];
    stage.appendChild(renderPrompt(step.promptKeys));
    if(step.helperKey){
      const helper = document.createElement('p');
      helper.className = 'mascot-convo__helper';
      helper.textContent = t(step.helperKey);
      stage.appendChild(helper);
    }

    if(step.type === 'text'){
      stage.appendChild(buildTextField(step, 'input'));
    } else if(step.type === 'textarea'){
      stage.appendChild(buildTextField(step, 'textarea'));
    } else if(step.type === 'choice'){
      const choices = document.createElement('div');
      choices.className = 'mascot-convo__choices';
      step.options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mascot-convo__choice';
        if(answers[step.key] === opt.value) btn.classList.add('is-selected');
        btn.textContent = t(opt.labelKey);
        btn.addEventListener('click', () => { answers[step.key] = opt.value; goNext(); });
        choices.appendChild(btn);
      });
      stage.appendChild(choices);
    } else if(step.type === 'contact'){
      const row = document.createElement('div');
      row.className = 'mascot-convo__contact-row';
      const nameField = document.createElement('label');
      nameField.className = 'mascot-convo__contact-field';
      nameField.innerHTML = `<span>${t('convo.s14.name')}</span>`;
      const nameInput = document.createElement('input');
      nameInput.type = 'text'; nameInput.name = 'convoName'; nameInput.autocomplete = 'name';
      nameInput.value = answers.contactName || '';
      nameInput.addEventListener('input', refreshPrimaryState);
      nameField.appendChild(nameInput);

      const emailField = document.createElement('label');
      emailField.className = 'mascot-convo__contact-field';
      emailField.innerHTML = `<span>${t('convo.s14.email')}</span>`;
      const emailInput = document.createElement('input');
      emailInput.type = 'email'; emailInput.name = 'convoEmail'; emailInput.autocomplete = 'email';
      emailInput.value = answers.email || '';
      emailInput.addEventListener('input', refreshPrimaryState);
      emailField.appendChild(emailInput);
      row.append(nameField, emailField);
      stage.appendChild(row);

      const phoneField = document.createElement('label');
      phoneField.className = 'mascot-convo__contact-field mascot-convo__contact-field--full';
      phoneField.innerHTML = `<span>${t('convo.s14.phone')}</span>`;
      const phoneInput = document.createElement('input');
      phoneInput.type = 'tel'; phoneInput.name = 'convoPhone'; phoneInput.autocomplete = 'tel';
      phoneInput.value = answers.phone || '';
      phoneField.appendChild(phoneInput);
      stage.appendChild(phoneField);
    }

    stage.appendChild(renderFooter(step));
    focusFirst();
  }

  async function submit(){
    const note = stage.querySelector('.mascot-convo__note');
    const sendBtn = stage.querySelector('.mascot-convo__primary');
    sendBtn.disabled = true;
    note.textContent = t('convo.end.sending');
    note.classList.remove('is-error');
    note.classList.add('is-visible');
    try{
      const payload = buildPayload();
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: opts.accessKey,
          subject: `New project inquiry via the NJORD mascot — ${payload.businessName || 'unnamed project'}`,
          from_name: payload.contactName || 'NJORD website visitor',
          message: formatSummary(payload),
          ...payload,
        }),
      });
      const data = await res.json();
      if(!data.success) throw new Error(data.message || 'submit failed');
      phase = 'sent';
      clearStage();
      stage.appendChild(renderPrompt(['convo.end.success']));
      // fully sent — clear so a later mascot click starts a fresh
      // conversation rather than resuming a completed one
      Object.keys(answers).forEach((k) => delete answers[k]);
      stepIndex = 0;
      startedAt = null;
      setTimeout(close, reduced ? 1200 : 2600);
    }catch(err){
      note.textContent = t('convo.end.error');
      note.classList.add('is-error');
      sendBtn.disabled = false;
    }
  }

  function buildPayload(){
    return {
      businessName: answers.businessName || '',
      businessDescription: answers.businessDescription || '',
      interest: answers.interest || '',
      problem: answers.problem || '',
      audience: answers.audience || '',
      contactName: answers.contactName || '',
      email: answers.email || '',
      phone: answers.phone || '',
      additionalNotes: answers.additionalNotes || '',
      timestamp: (startedAt || new Date()).toISOString(),
      language: getLang(),
    };
  }

  function formatSummary(p){
    return [
      `Business/project: ${p.businessName}`,
      `What they do: ${p.businessDescription}`,
      `Came for: ${p.interest}`,
      `Problem/goal: ${p.problem}`,
      `Audience: ${p.audience}`,
      `Additional notes: ${p.additionalNotes || '—'}`,
      `Language: ${p.language}`,
    ].join('\n');
  }

  function renderEnd(){
    phase = 'end';
    updateChrome();
    clearStage();
    stage.appendChild(renderPrompt(['convo.end.line1', 'convo.end.line2']));
    const foot = document.createElement('div');
    foot.className = 'mascot-convo__foot';
    const sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.className = 'mascot-convo__primary mascot-convo__primary--send';
    sendBtn.innerHTML = `${t('convo.end.send')} <span aria-hidden="true">→</span>`;
    sendBtn.addEventListener('click', submit);
    foot.appendChild(sendBtn);
    const note = document.createElement('span');
    note.className = 'mascot-convo__note';
    note.setAttribute('aria-live', 'polite');
    foot.appendChild(note);
    stage.appendChild(foot);
    focusFirst();
  }

  function open(){
    if(phase !== 'closed'){ focusFirst(); return; }
    container.hidden = false;
    requestAnimationFrame(() => container.classList.add('is-open'));
    headEl?.classList.add('is-convo-open');
    opts.onOpenChange?.(true);
    if(Object.keys(answers).length && startedAt) renderStep();
    else renderIntro();
  }

  function close(){
    container.classList.remove('is-open');
    headEl?.classList.remove('is-convo-open');
    phase = 'closed';
    opts.onOpenChange?.(false);
    const done = () => { container.hidden = true; };
    if(reduced) done();
    else setTimeout(done, 260);
  }

  // Floats to the left and slightly above the mascot's own current
  // on-screen frame (main.js calls this every frame alongside the
  // hit-target sync, since he sways/idles even when not scrolling) —
  // makes it read as him talking, not a page-anchored form. Anchoring
  // to the panel's own bottom-right corner via the second translate
  // (a percentage, so it's relative to the panel's own size) means it
  // grows up-and-left from that point regardless of content length.
  function updatePosition(frame){
    if(!frame) return;
    // Below 720px the panel is a full-screen fixed layer (style.css), not
    // a box that floats next to him — skip the anchor math entirely so it
    // isn't wasted work, and so nothing here can leave a stray inline
    // transform/max-height fighting that layout.
    if(window.innerWidth < 720) return;
    const gapX = 22, gapY = 10;
    const GUTTER = 16;
    const vw = window.innerWidth, vh = window.innerHeight;
    // The panel grows up-and-left from the mascot (translate(-100%,-100%)
    // below anchors it by its OWN bottom-right corner) — on a narrow
    // phone, if he's currently sitting anywhere near the left edge, that
    // growth-direction can push the panel's left edge past x=0 entirely,
    // off-screen and unreachable (this is what made the opening question
    // and "kam një projekt" button run off the left side on mobile).
    // Clamping the corner itself, using the panel's own real rendered
    // size, keeps the whole panel on-screen regardless of where along
    // the mascot's anchor range he happens to be.
    const panelW = container.offsetWidth || 0;
    const panelH = container.offsetHeight || 0;
    let rightEdge = frame.x - frame.width / 2 - gapX;
    rightEdge = Math.max(GUTTER + panelW, Math.min(vw - GUTTER, rightEdge));
    let bottomEdge = frame.y - frame.height / 2 - gapY;
    bottomEdge = Math.max(GUTTER + panelH, Math.min(vh - GUTTER, bottomEdge));
    container.style.transform = `translate(${rightEdge}px, ${bottomEdge}px) translate(-100%, -100%)`;
    // The contact section's top border is a hard ceiling. The panel can
    // widen, but it cannot grow upward through that line; longer stages
    // scroll internally instead. Subtract the fixed top controls and the
    // panel's row gap so the entire panel—not only the stage—fits below it.
    const panel = container.querySelector('.mascot-convo__panel');
    const topBar = container.querySelector('.mascot-convo__top');
    const contactTop = container.closest('.contact')?.getBoundingClientRect().top ?? 16;
    const panelGap = panel ? parseFloat(getComputedStyle(panel).rowGap) || 16 : 16;
    const chromeHeight = (topBar?.getBoundingClientRect().height || 0) + panelGap;
    const availableStageHeight = bottomEdge - Math.max(16, contactTop) - chromeHeight;
    stage.style.maxHeight = `${Math.max(80, availableStageHeight)}px`;
  }

  backBtn.addEventListener('click', goBack);
  closeBtn.addEventListener('click', close);
  container.addEventListener('keydown', (e) => { if(e.key === 'Escape') close(); });

  return { open, close, updatePosition };
}
