import './style.css';
import { HeroScene } from './hero/HeroScene';
import { CollectionsSection } from './collections/CollectionsSection';
import { wrapChars } from './hero/utils/wrapChars';

const canvas = document.querySelector<HTMLCanvasElement>('#hero-canvas')!;
const pinTarget = document.querySelector<HTMLElement>('#hero-wrapper')!;

document.querySelectorAll<HTMLElement>('[data-char-wrap]').forEach(wrapChars);

const anchorDots = Array.from(document.querySelectorAll<HTMLElement>('.hero-collections .dot.is-anchor'));

new HeroScene(canvas, pinTarget, {
  anchorDots,
  objectInfoEl: document.querySelector<HTMLElement>('#hero-object-info') ?? undefined,
  braceletInfoEl: document.querySelector<HTMLElement>('#hero-object-info-bracelet') ?? undefined,
  objectIdEl: document.querySelector<HTMLElement>('#hero-object-id') ?? undefined,
  coordMarksEl: document.querySelector<HTMLElement>('#hero-coord-marks') ?? undefined,
  exploreButton: document.querySelector<HTMLElement>('#hero-explore-btn') ?? undefined,
  braceletExploreButton: document.querySelector<HTMLElement>('#hero-explore-btn-bracelet') ?? undefined,
  earringInfoEl: document.querySelector<HTMLElement>('#hero-object-info-earring') ?? undefined,
  earringExploreButton: document.querySelector<HTMLElement>('#hero-explore-btn-earring') ?? undefined,
  annotationsEl: document.querySelector<HTMLElement>('#hero-annotations') ?? undefined,
  annotationEls: Array.from(document.querySelectorAll<HTMLElement>('#hero-annotations .hero-annotation')),
});

const collectionsWrapper = document.querySelector<HTMLElement>('#collections-wrapper')!;

new CollectionsSection(collectionsWrapper, {
  panelEls: Array.from(document.querySelectorAll<HTMLElement>('.collections-panel')),
  navLineEls: Array.from(document.querySelectorAll<HTMLElement>('.collections-nav-line')),
});
