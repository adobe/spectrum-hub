// deps/swc/swc-dist/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e(e16, t8, n11, r9) {
  var i9 = arguments.length, a6 = i9 < 3 ? t8 : r9 === null ? r9 = Object.getOwnPropertyDescriptor(t8, n11) : r9, o14;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a6 = Reflect.decorate(e16, t8, n11, r9);
  else for (var s6 = e16.length - 1; s6 >= 0; s6--) (o14 = e16[s6]) && (a6 = (i9 < 3 ? o14(a6) : i9 > 3 ? o14(t8, n11, a6) : o14(t8, n11)) || a6);
  return i9 > 3 && a6 && Object.defineProperty(t8, n11, a6), a6;
}

// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e2 = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t8, e16, o14) {
    if (this._$cssResult$ = true, o14 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t8, this.t = e16;
  }
  get styleSheet() {
    let t8 = this.o;
    const s6 = this.t;
    if (e2 && void 0 === t8) {
      const e16 = void 0 !== s6 && 1 === s6.length;
      e16 && (t8 = o.get(s6)), void 0 === t8 && ((this.o = t8 = new CSSStyleSheet()).replaceSync(this.cssText), e16 && o.set(s6, t8));
    }
    return t8;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t8) => new n("string" == typeof t8 ? t8 : t8 + "", void 0, s);
var i = (t8, ...e16) => {
  const o14 = 1 === t8.length ? t8[0] : e16.reduce((e17, s6, o15) => e17 + ((t9) => {
    if (true === t9._$cssResult$) return t9.cssText;
    if ("number" == typeof t9) return t9;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t9 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s6) + t8[o15 + 1], t8[0]);
  return new n(o14, t8, s);
};
var S = (s6, o14) => {
  if (e2) s6.adoptedStyleSheets = o14.map((t8) => t8 instanceof CSSStyleSheet ? t8 : t8.styleSheet);
  else for (const e16 of o14) {
    const o15 = document.createElement("style"), n11 = t.litNonce;
    void 0 !== n11 && o15.setAttribute("nonce", n11), o15.textContent = e16.cssText, s6.appendChild(o15);
  }
};
var c = e2 ? (t8) => t8 : (t8) => t8 instanceof CSSStyleSheet ? ((t9) => {
  let e16 = "";
  for (const s6 of t9.cssRules) e16 += s6.cssText;
  return r(e16);
})(t8) : t8;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e3, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t8, s6) => t8;
var u = { toAttribute(t8, s6) {
  switch (s6) {
    case Boolean:
      t8 = t8 ? l : null;
      break;
    case Object:
    case Array:
      t8 = null == t8 ? t8 : JSON.stringify(t8);
  }
  return t8;
}, fromAttribute(t8, s6) {
  let i9 = t8;
  switch (s6) {
    case Boolean:
      i9 = null !== t8;
      break;
    case Number:
      i9 = null === t8 ? null : Number(t8);
      break;
    case Object:
    case Array:
      try {
        i9 = JSON.parse(t8);
      } catch (t9) {
        i9 = null;
      }
  }
  return i9;
} };
var f = (t8, s6) => !i2(t8, s6);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t8) {
    this._$Ei(), (this.l ??= []).push(t8);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t8, s6 = b) {
    if (s6.state && (s6.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t8) && ((s6 = Object.create(s6)).wrapped = true), this.elementProperties.set(t8, s6), !s6.noAccessor) {
      const i9 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t8, i9, s6);
      void 0 !== h3 && e3(this.prototype, t8, h3);
    }
  }
  static getPropertyDescriptor(t8, s6, i9) {
    const { get: e16, set: r9 } = h(this.prototype, t8) ?? { get() {
      return this[s6];
    }, set(t9) {
      this[s6] = t9;
    } };
    return { get: e16, set(s7) {
      const h3 = e16?.call(this);
      r9?.call(this, s7), this.requestUpdate(t8, h3, i9);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t8) {
    return this.elementProperties.get(t8) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t8 = n2(this);
    t8.finalize(), void 0 !== t8.l && (this.l = [...t8.l]), this.elementProperties = new Map(t8.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t9 = this.properties, s6 = [...r2(t9), ...o2(t9)];
      for (const i9 of s6) this.createProperty(i9, t9[i9]);
    }
    const t8 = this[Symbol.metadata];
    if (null !== t8) {
      const s6 = litPropertyMetadata.get(t8);
      if (void 0 !== s6) for (const [t9, i9] of s6) this.elementProperties.set(t9, i9);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t9, s6] of this.elementProperties) {
      const i9 = this._$Eu(t9, s6);
      void 0 !== i9 && this._$Eh.set(i9, t9);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s6) {
    const i9 = [];
    if (Array.isArray(s6)) {
      const e16 = new Set(s6.flat(1 / 0).reverse());
      for (const s7 of e16) i9.unshift(c(s7));
    } else void 0 !== s6 && i9.push(c(s6));
    return i9;
  }
  static _$Eu(t8, s6) {
    const i9 = s6.attribute;
    return false === i9 ? void 0 : "string" == typeof i9 ? i9 : "string" == typeof t8 ? t8.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t8) => this.enableUpdating = t8), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t8) => t8(this));
  }
  addController(t8) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t8), void 0 !== this.renderRoot && this.isConnected && t8.hostConnected?.();
  }
  removeController(t8) {
    this._$EO?.delete(t8);
  }
  _$E_() {
    const t8 = /* @__PURE__ */ new Map(), s6 = this.constructor.elementProperties;
    for (const i9 of s6.keys()) this.hasOwnProperty(i9) && (t8.set(i9, this[i9]), delete this[i9]);
    t8.size > 0 && (this._$Ep = t8);
  }
  createRenderRoot() {
    const t8 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t8, this.constructor.elementStyles), t8;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t8) => t8.hostConnected?.());
  }
  enableUpdating(t8) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t8) => t8.hostDisconnected?.());
  }
  attributeChangedCallback(t8, s6, i9) {
    this._$AK(t8, i9);
  }
  _$ET(t8, s6) {
    const i9 = this.constructor.elementProperties.get(t8), e16 = this.constructor._$Eu(t8, i9);
    if (void 0 !== e16 && true === i9.reflect) {
      const h3 = (void 0 !== i9.converter?.toAttribute ? i9.converter : u).toAttribute(s6, i9.type);
      this._$Em = t8, null == h3 ? this.removeAttribute(e16) : this.setAttribute(e16, h3), this._$Em = null;
    }
  }
  _$AK(t8, s6) {
    const i9 = this.constructor, e16 = i9._$Eh.get(t8);
    if (void 0 !== e16 && this._$Em !== e16) {
      const t9 = i9.getPropertyOptions(e16), h3 = "function" == typeof t9.converter ? { fromAttribute: t9.converter } : void 0 !== t9.converter?.fromAttribute ? t9.converter : u;
      this._$Em = e16;
      const r9 = h3.fromAttribute(s6, t9.type);
      this[e16] = r9 ?? this._$Ej?.get(e16) ?? r9, this._$Em = null;
    }
  }
  requestUpdate(t8, s6, i9, e16 = false, h3) {
    if (void 0 !== t8) {
      const r9 = this.constructor;
      if (false === e16 && (h3 = this[t8]), i9 ??= r9.getPropertyOptions(t8), !((i9.hasChanged ?? f)(h3, s6) || i9.useDefault && i9.reflect && h3 === this._$Ej?.get(t8) && !this.hasAttribute(r9._$Eu(t8, i9)))) return;
      this.C(t8, s6, i9);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t8, s6, { useDefault: i9, reflect: e16, wrapped: h3 }, r9) {
    i9 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t8) && (this._$Ej.set(t8, r9 ?? s6 ?? this[t8]), true !== h3 || void 0 !== r9) || (this._$AL.has(t8) || (this.hasUpdated || i9 || (s6 = void 0), this._$AL.set(t8, s6)), true === e16 && this._$Em !== t8 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t8));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t9) {
      Promise.reject(t9);
    }
    const t8 = this.scheduleUpdate();
    return null != t8 && await t8, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t10, s7] of this._$Ep) this[t10] = s7;
        this._$Ep = void 0;
      }
      const t9 = this.constructor.elementProperties;
      if (t9.size > 0) for (const [s7, i9] of t9) {
        const { wrapped: t10 } = i9, e16 = this[s7];
        true !== t10 || this._$AL.has(s7) || void 0 === e16 || this.C(s7, void 0, i9, e16);
      }
    }
    let t8 = false;
    const s6 = this._$AL;
    try {
      t8 = this.shouldUpdate(s6), t8 ? (this.willUpdate(s6), this._$EO?.forEach((t9) => t9.hostUpdate?.()), this.update(s6)) : this._$EM();
    } catch (s7) {
      throw t8 = false, this._$EM(), s7;
    }
    t8 && this._$AE(s6);
  }
  willUpdate(t8) {
  }
  _$AE(t8) {
    this._$EO?.forEach((t9) => t9.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t8)), this.updated(t8);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t8) {
    return true;
  }
  update(t8) {
    this._$Eq &&= this._$Eq.forEach((t9) => this._$ET(t9, this[t9])), this._$EM();
  }
  updated(t8) {
  }
  firstUpdated(t8) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t8) => t8;
var s2 = t2.trustedTypes;
var e4 = s2 ? s2.createPolicy("lit-html", { createHTML: (t8) => t8 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t8) => null === t8 || "object" != typeof t8 && "function" != typeof t8;
var u2 = Array.isArray;
var d2 = (t8) => u2(t8) || "function" == typeof t8?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t8) => (i9, ...s6) => ({ _$litType$: t8, strings: i9, values: s6 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t8, i9) {
  if (!u2(t8) || !t8.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e4 ? e4.createHTML(i9) : i9;
}
var N = (t8, i9) => {
  const s6 = t8.length - 1, e16 = [];
  let n11, l5 = 2 === i9 ? "<svg>" : 3 === i9 ? "<math>" : "", c4 = v;
  for (let i10 = 0; i10 < s6; i10++) {
    const s7 = t8[i10];
    let a6, u3, d4 = -1, f3 = 0;
    for (; f3 < s7.length && (c4.lastIndex = f3, u3 = c4.exec(s7), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n11 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n11 ?? v, d4 = -1) : void 0 === u3[1] ? d4 = -2 : (d4 = c4.lastIndex - u3[2].length, a6 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n11 = void 0);
    const x2 = c4 === p2 && t8[i10 + 1].startsWith("/>") ? " " : "";
    l5 += c4 === v ? s7 + r3 : d4 >= 0 ? (e16.push(a6), s7.slice(0, d4) + h2 + s7.slice(d4) + o3 + x2) : s7 + o3 + (-2 === d4 ? i10 : x2);
  }
  return [V(t8, l5 + (t8[s6] || "<?>") + (2 === i9 ? "</svg>" : 3 === i9 ? "</math>" : "")), e16];
};
var S2 = class _S {
  constructor({ strings: t8, _$litType$: i9 }, e16) {
    let r9;
    this.parts = [];
    let l5 = 0, a6 = 0;
    const u3 = t8.length - 1, d4 = this.parts, [f3, v2] = N(t8, i9);
    if (this.el = _S.createElement(f3, e16), P.currentNode = this.el.content, 2 === i9 || 3 === i9) {
      const t9 = this.el.content.firstChild;
      t9.replaceWith(...t9.childNodes);
    }
    for (; null !== (r9 = P.nextNode()) && d4.length < u3; ) {
      if (1 === r9.nodeType) {
        if (r9.hasAttributes()) for (const t9 of r9.getAttributeNames()) if (t9.endsWith(h2)) {
          const i10 = v2[a6++], s6 = r9.getAttribute(t9).split(o3), e17 = /([.?@])?(.*)/.exec(i10);
          d4.push({ type: 1, index: l5, name: e17[2], strings: s6, ctor: "." === e17[1] ? I : "?" === e17[1] ? L : "@" === e17[1] ? z : H }), r9.removeAttribute(t9);
        } else t9.startsWith(o3) && (d4.push({ type: 6, index: l5 }), r9.removeAttribute(t9));
        if (y2.test(r9.tagName)) {
          const t9 = r9.textContent.split(o3), i10 = t9.length - 1;
          if (i10 > 0) {
            r9.textContent = s2 ? s2.emptyScript : "";
            for (let s6 = 0; s6 < i10; s6++) r9.append(t9[s6], c3()), P.nextNode(), d4.push({ type: 2, index: ++l5 });
            r9.append(t9[i10], c3());
          }
        }
      } else if (8 === r9.nodeType) if (r9.data === n3) d4.push({ type: 2, index: l5 });
      else {
        let t9 = -1;
        for (; -1 !== (t9 = r9.data.indexOf(o3, t9 + 1)); ) d4.push({ type: 7, index: l5 }), t9 += o3.length - 1;
      }
      l5++;
    }
  }
  static createElement(t8, i9) {
    const s6 = l2.createElement("template");
    return s6.innerHTML = t8, s6;
  }
};
function M(t8, i9, s6 = t8, e16) {
  if (i9 === E) return i9;
  let h3 = void 0 !== e16 ? s6._$Co?.[e16] : s6._$Cl;
  const o14 = a2(i9) ? void 0 : i9._$litDirective$;
  return h3?.constructor !== o14 && (h3?._$AO?.(false), void 0 === o14 ? h3 = void 0 : (h3 = new o14(t8), h3._$AT(t8, s6, e16)), void 0 !== e16 ? (s6._$Co ??= [])[e16] = h3 : s6._$Cl = h3), void 0 !== h3 && (i9 = M(t8, h3._$AS(t8, i9.values), h3, e16)), i9;
}
var R = class {
  constructor(t8, i9) {
    this._$AV = [], this._$AN = void 0, this._$AD = t8, this._$AM = i9;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t8) {
    const { el: { content: i9 }, parts: s6 } = this._$AD, e16 = (t8?.creationScope ?? l2).importNode(i9, true);
    P.currentNode = e16;
    let h3 = P.nextNode(), o14 = 0, n11 = 0, r9 = s6[0];
    for (; void 0 !== r9; ) {
      if (o14 === r9.index) {
        let i10;
        2 === r9.type ? i10 = new k(h3, h3.nextSibling, this, t8) : 1 === r9.type ? i10 = new r9.ctor(h3, r9.name, r9.strings, this, t8) : 6 === r9.type && (i10 = new Z(h3, this, t8)), this._$AV.push(i10), r9 = s6[++n11];
      }
      o14 !== r9?.index && (h3 = P.nextNode(), o14++);
    }
    return P.currentNode = l2, e16;
  }
  p(t8) {
    let i9 = 0;
    for (const s6 of this._$AV) void 0 !== s6 && (void 0 !== s6.strings ? (s6._$AI(t8, s6, i9), i9 += s6.strings.length - 2) : s6._$AI(t8[i9])), i9++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t8, i9, s6, e16) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t8, this._$AB = i9, this._$AM = s6, this.options = e16, this._$Cv = e16?.isConnected ?? true;
  }
  get parentNode() {
    let t8 = this._$AA.parentNode;
    const i9 = this._$AM;
    return void 0 !== i9 && 11 === t8?.nodeType && (t8 = i9.parentNode), t8;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t8, i9 = this) {
    t8 = M(this, t8, i9), a2(t8) ? t8 === A || null == t8 || "" === t8 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t8 !== this._$AH && t8 !== E && this._(t8) : void 0 !== t8._$litType$ ? this.$(t8) : void 0 !== t8.nodeType ? this.T(t8) : d2(t8) ? this.k(t8) : this._(t8);
  }
  O(t8) {
    return this._$AA.parentNode.insertBefore(t8, this._$AB);
  }
  T(t8) {
    this._$AH !== t8 && (this._$AR(), this._$AH = this.O(t8));
  }
  _(t8) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t8 : this.T(l2.createTextNode(t8)), this._$AH = t8;
  }
  $(t8) {
    const { values: i9, _$litType$: s6 } = t8, e16 = "number" == typeof s6 ? this._$AC(t8) : (void 0 === s6.el && (s6.el = S2.createElement(V(s6.h, s6.h[0]), this.options)), s6);
    if (this._$AH?._$AD === e16) this._$AH.p(i9);
    else {
      const t9 = new R(e16, this), s7 = t9.u(this.options);
      t9.p(i9), this.T(s7), this._$AH = t9;
    }
  }
  _$AC(t8) {
    let i9 = C.get(t8.strings);
    return void 0 === i9 && C.set(t8.strings, i9 = new S2(t8)), i9;
  }
  k(t8) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i9 = this._$AH;
    let s6, e16 = 0;
    for (const h3 of t8) e16 === i9.length ? i9.push(s6 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s6 = i9[e16], s6._$AI(h3), e16++;
    e16 < i9.length && (this._$AR(s6 && s6._$AB.nextSibling, e16), i9.length = e16);
  }
  _$AR(t8 = this._$AA.nextSibling, s6) {
    for (this._$AP?.(false, true, s6); t8 !== this._$AB; ) {
      const s7 = i3(t8).nextSibling;
      i3(t8).remove(), t8 = s7;
    }
  }
  setConnected(t8) {
    void 0 === this._$AM && (this._$Cv = t8, this._$AP?.(t8));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t8, i9, s6, e16, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t8, this.name = i9, this._$AM = e16, this.options = h3, s6.length > 2 || "" !== s6[0] || "" !== s6[1] ? (this._$AH = Array(s6.length - 1).fill(new String()), this.strings = s6) : this._$AH = A;
  }
  _$AI(t8, i9 = this, s6, e16) {
    const h3 = this.strings;
    let o14 = false;
    if (void 0 === h3) t8 = M(this, t8, i9, 0), o14 = !a2(t8) || t8 !== this._$AH && t8 !== E, o14 && (this._$AH = t8);
    else {
      const e17 = t8;
      let n11, r9;
      for (t8 = h3[0], n11 = 0; n11 < h3.length - 1; n11++) r9 = M(this, e17[s6 + n11], i9, n11), r9 === E && (r9 = this._$AH[n11]), o14 ||= !a2(r9) || r9 !== this._$AH[n11], r9 === A ? t8 = A : t8 !== A && (t8 += (r9 ?? "") + h3[n11 + 1]), this._$AH[n11] = r9;
    }
    o14 && !e16 && this.j(t8);
  }
  j(t8) {
    t8 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t8 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t8) {
    this.element[this.name] = t8 === A ? void 0 : t8;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t8) {
    this.element.toggleAttribute(this.name, !!t8 && t8 !== A);
  }
};
var z = class extends H {
  constructor(t8, i9, s6, e16, h3) {
    super(t8, i9, s6, e16, h3), this.type = 5;
  }
  _$AI(t8, i9 = this) {
    if ((t8 = M(this, t8, i9, 0) ?? A) === E) return;
    const s6 = this._$AH, e16 = t8 === A && s6 !== A || t8.capture !== s6.capture || t8.once !== s6.once || t8.passive !== s6.passive, h3 = t8 !== A && (s6 === A || e16);
    e16 && this.element.removeEventListener(this.name, this, s6), h3 && this.element.addEventListener(this.name, this, t8), this._$AH = t8;
  }
  handleEvent(t8) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t8) : this._$AH.handleEvent(t8);
  }
};
var Z = class {
  constructor(t8, i9, s6) {
    this.element = t8, this.type = 6, this._$AN = void 0, this._$AM = i9, this.options = s6;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t8) {
    M(this, t8);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.2");
var D = (t8, i9, s6) => {
  const e16 = s6?.renderBefore ?? i9;
  let h3 = e16._$litPart$;
  if (void 0 === h3) {
    const t9 = s6?.renderBefore ?? null;
    e16._$litPart$ = h3 = new k(i9.insertBefore(c3(), t9), t9, void 0, s6 ?? {});
  }
  return h3._$AI(t8), h3;
};

// node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t8 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t8.firstChild, t8;
  }
  update(t8) {
    const r9 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t8), this._$Do = D(r9, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i4._$litElement$ = true, i4["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i4 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i4 });
(s3.litElementVersions ??= []).push("4.2.2");

// deps/swc/swc-dist/components/icon/icon.js
var t3 = i`:host{--swc-icon-inline-size: var(--swc-workflow-icon-medium);--swc-icon-block-size: var(--swc-workflow-icon-medium);display:inline-flex;inline-size:var(--swc-icon-inline-size);block-size:var(--swc-icon-block-size);color:var(--swc-icon-color, currentColor)}:host([size=\"xs\"]){--swc-icon-inline-size: var(--swc-workflow-icon-extra-small);--swc-icon-block-size: var(--swc-workflow-icon-extra-small)}:host([size=\"s\"]){--swc-icon-inline-size: var(--swc-workflow-icon-small);--swc-icon-block-size: var(--swc-workflow-icon-small)}:host([size=\"m\"]){--swc-icon-inline-size: var(--swc-workflow-icon-medium);--swc-icon-block-size: var(--swc-workflow-icon-medium)}:host([size=\"l\"]){--swc-icon-inline-size: var(--swc-workflow-icon-large);--swc-icon-block-size: var(--swc-workflow-icon-large)}:host([size=\"xl\"]){--swc-icon-inline-size: var(--swc-workflow-icon-extra-large);--swc-icon-block-size: var(--swc-workflow-icon-extra-large)}.swc-Icon{display:block;inline-size:100%;block-size:100%}svg,.swc-Icon>svg,::slotted(*){display:block;inline-size:100%;block-size:100%;fill:currentcolor}`;

// deps/swc/swc-dist/core/components/icon/Icon.types.js
var e5 = [
  "xs",
  "s",
  "m",
  "l",
  "xl"
];

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e6(e16, t8, n11, r9) {
  var i9 = arguments.length, a6 = i9 < 3 ? t8 : r9 === null ? r9 = Object.getOwnPropertyDescriptor(t8, n11) : r9, o14;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a6 = Reflect.decorate(e16, t8, n11, r9);
  else for (var s6 = e16.length - 1; s6 >= 0; s6--) (o14 = e16[s6]) && (a6 = (i9 < 3 ? o14(a6) : i9 > 3 ? o14(t8, n11, a6) : o14(t8, n11)) || a6);
  return i9 > 3 && a6 && Object.defineProperty(t8, n11, a6), a6;
}

// node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t8 = o5, e16, r9) => {
  const { kind: n11, metadata: i9 } = r9;
  let s6 = globalThis.litPropertyMetadata.get(i9);
  if (void 0 === s6 && globalThis.litPropertyMetadata.set(i9, s6 = /* @__PURE__ */ new Map()), "setter" === n11 && ((t8 = Object.create(t8)).wrapped = true), s6.set(r9.name, t8), "accessor" === n11) {
    const { name: o14 } = r9;
    return { set(r10) {
      const n12 = e16.get.call(this);
      e16.set.call(this, r10), this.requestUpdate(o14, n12, t8, true, r10);
    }, init(e17) {
      return void 0 !== e17 && this.C(o14, void 0, t8, e17), e17;
    } };
  }
  if ("setter" === n11) {
    const { name: o14 } = r9;
    return function(r10) {
      const n12 = this[o14];
      e16.call(this, r10), this.requestUpdate(o14, n12, t8, true, r10);
    };
  }
  throw Error("Unsupported decorator location: " + n11);
};
function n4(t8) {
  return (e16, o14) => "object" == typeof o14 ? r4(t8, e16, o14) : ((t9, e17, o15) => {
    const r9 = e17.hasOwnProperty(o15);
    return e17.constructor.createProperty(o15, t9), r9 ? Object.getOwnPropertyDescriptor(e17, o15) : void 0;
  })(t8, e16, o14);
}

// node_modules/@lit/reactive-element/decorators/base.js
var e7 = (e16, t8, c4) => (c4.configurable = true, c4.enumerable = true, Reflect.decorate && "object" != typeof t8 && Object.defineProperty(e16, t8, c4), c4);

// node_modules/@lit/reactive-element/decorators/query-all.js
var e8;
function r5(r9) {
  return (n11, o14) => e7(n11, o14, { get() {
    return (this.renderRoot ?? (e8 ??= document.createDocumentFragment())).querySelectorAll(r9);
  } });
}

// node_modules/@lit/reactive-element/decorators/query-assigned-elements.js
function o6(o14) {
  return (e16, n11) => {
    const { slot: r9, selector: s6 } = o14 ?? {}, c4 = "slot" + (r9 ? `[name=${r9}]` : ":not([name])");
    return e7(e16, n11, { get() {
      const t8 = this.renderRoot?.querySelector(c4), e17 = t8?.assignedElements(o14) ?? [];
      return void 0 === s6 ? e17 : e17.filter((t9) => t9.matches(s6));
    } });
  };
}

// deps/swc/swc-dist/core/element/define-element.js
function e9(e16, t8) {
  window.__swc && window.__swc.DEBUG && customElements.get(e16) && window.__swc.warn(void 0, `Attempted to redefine <${e16}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e16, t8);
}

// deps/swc/swc-dist/core/element/version.js
var e10 = "0.1.0";
var t4 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e11(e16 = document) {
  var t8;
  let n11 = e16.activeElement;
  for (; !(n11 == null || (t8 = n11.shadowRoot) == null) && t8.activeElement; ) n11 = n11.shadowRoot.activeElement;
  return n11;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i5;
function a3(t8) {
  class n11 extends t8 {
    hasVisibleFocusInTree() {
      var t9;
      let n12 = e11(this.getRootNode());
      return (t9 = n12 == null ? void 0 : n12.matches(":focus-visible")) == null ? false : t9;
    }
  }
  return n11;
}
var o7 = class extends a3(i4) {
  get dir() {
    var e16;
    return (e16 = getComputedStyle(this).direction) == null ? "ltr" : e16;
  }
};
if (i5 = o7, i5.VERSION = e10, i5.CORE_VERSION = t4, true) {
  let e16 = {
    default: false,
    accessibility: false,
    api: false
  }, t8 = {
    default: false,
    low: false,
    medium: false,
    high: false,
    deprecation: false
  };
  window.__swc = {
    ...window.__swc,
    DEBUG: true,
    ignoreWarningLocalNames: { ...((s6 = window.__swc) == null ? void 0 : s6.ignoreWarningLocalNames) || {} },
    ignoreWarningTypes: {
      ...e16,
      ...((c4 = window.__swc) == null ? void 0 : c4.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t8,
      ...((l5 = window.__swc) == null ? void 0 : l5.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e17, t9, n11, { type: r9 = "api", level: i9 = "default", issues: a6 } = {}) => {
      let { localName: o14 = "base" } = e17 || {}, s7 = `${o14}:${r9}:${i9}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s7) || window.__swc.ignoreWarningLocalNames[o14] || window.__swc.ignoreWarningTypes[r9] || window.__swc.ignoreWarningLevels[i9]) return;
      window.__swc.issuedWarnings.add(s7);
      let c5 = "";
      a6 && a6.length && (a6.unshift(""), c5 = a6.join("\n    - ") + "\n");
      let l6 = i9 === "deprecation" ? "DEPRECATION NOTICE: " : "", u3 = e17 ? "\nInspect this issue in the follow element:" : "", d4 = (e17 ? "\n\n" : "\n") + n11 + "\n", f3 = [];
      f3.push(l6 + t9 + "\n" + c5 + u3), e17 && f3.push(e17), f3.push(d4, { data: {
        localName: o14,
        type: r9,
        level: i9
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s6;
var c4;
var l5;

// deps/swc/swc-dist/core/mixins/sized-mixin.js
var r6 = [
  "s",
  "m",
  "l",
  "xl"
];
function i7(n11, { validSizes: i9 = [...r6], noDefaultSize: a6, defaultSize: o14 = "m" } = {}) {
  var s6;
  class c4 extends n11 {
    constructor(...e16) {
      super(...e16), this._size = o14;
    }
    get size() {
      return this._size || o14;
    }
    set size(e16) {
      let t8 = a6 ? null : o14, n12 = e16 && e16.toLocaleLowerCase(), r9 = this.constructor.VALID_SIZES.includes(n12) ? n12 : t8;
      if (r9 && this.setAttribute("size", r9), this._size === r9) return;
      let i10 = this._size;
      this._size = r9, this.requestUpdate("size", i10);
    }
    update(e16) {
      !this.hasAttribute("size") && !a6 && this.setAttribute("size", this.size), super.update(e16);
    }
  }
  return s6 = c4, s6.VALID_SIZES = i9, e6([n4({ type: String })], c4.prototype, "size", null), c4;
}

// deps/swc/swc-dist/core/components/icon/Icon.base.js
var o11 = class extends i7(o7, { validSizes: [...e5] }) {
  constructor(...e16) {
    super(...e16), this.label = "";
  }
  firstUpdated(e16) {
    super.firstUpdated(e16), this.updateSlottedIcon(), this.updateHostAccessibility();
  }
  updated(e16) {
    super.updated(e16), e16.has("label") && (this.updateSlottedIcon(), this.updateHostAccessibility());
  }
  handleSlotChange() {
    this.updateSlottedIcon();
  }
  updateSlottedIcon() {
    var e16;
    let [t8] = this.defaultSlotElements;
    if (!t8) return;
    let n11 = t8 instanceof SVGElement ? t8 : (e16 = t8.querySelector) == null ? void 0 : e16.call(t8, "svg");
    n11 && (n11.setAttribute("role", "img"), this.label ? (n11.setAttribute("aria-label", this.label), n11.removeAttribute("aria-hidden")) : (n11.setAttribute("aria-hidden", "true"), n11.removeAttribute("aria-label")));
  }
  updateHostAccessibility() {
    this.label ? this.removeAttribute("aria-hidden") : this.setAttribute("aria-hidden", "true");
  }
};
e6([n4({ type: String })], o11.prototype, "label", void 0), e6([o6({ flatten: true })], o11.prototype, "defaultSlotElements", void 0);

// deps/swc/swc-dist/components/icon/Icon2.js
var r7 = class extends o11 {
  static get styles() {
    return [t3];
  }
  render() {
    return b2`
      <span class="swc-Icon">
        <slot @slotchange=${this.handleSlotChange}></slot>
      </span>
    `;
  }
};

// deps/swc/swc-dist/components/icon/swc-icon.js
e9("swc-icon", r7);

// deps/swc/swc-dist/patterns/conversational-ai/utils/icons/index.js
var o12 = () => b2`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
    <path
      fill="currentColor"
      d="M18.5303 8.22461C18.019 7.45801 17.1636 7 16.2422 7H13.1973C12.8101 7 12.4819 6.69727 12.4502 6.31152L12.25 3.93164C12.2519 3.87988 12.248 3.79394 12.2393 3.74316C12.1279 3.08984 11.8667 1.55957 10.0649 1.55957C8.583 1.55957 8.27538 3.22852 7.97802 4.84375C7.63818 6.69043 7.31982 7.99707 6.31786 8H4.24999C3.00927 8 1.99999 9.00977 1.99999 10.25V15.75C1.99999 16.9902 3.00927 18 4.24999 18H11.75C11.7842 18 11.8179 17.9981 11.8506 17.9932H13.2905C14.8091 17.9922 16.167 17.085 16.7505 15.6836L18.7808 10.8066C19.1352 9.95605 19.0415 8.99121 18.5303 8.22461ZM3.5 15.75V10.25C3.5 9.83691 3.83643 9.5 4.25 9.5H5.25V16.5H4.25C3.83643 16.5 3.5 16.1631 3.5 15.75ZM17.396 10.2305L15.3657 15.1074C15.0156 15.9482 14.2007 16.4922 13.2901 16.4932H11.75C11.7158 16.4932 11.6821 16.4951 11.6494 16.5H6.75001V9.46655C8.70582 9.1665 9.13496 6.84277 9.45362 5.11523C9.57618 4.44824 9.80518 3.20605 10.065 3.05957C10.4258 3.05957 10.5942 3.05957 10.7505 3.9375C10.751 3.95215 10.7515 3.9668 10.7525 3.97852L10.9551 6.43457C11.0503 7.59277 12.0352 8.5 13.1973 8.5H16.2422C16.6675 8.5 17.0464 8.70312 17.2822 9.05664C17.5181 9.41016 17.5596 9.83789 17.396 10.2305Z"
    />
  </svg>
`;
var s5 = () => b2`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
    <path
      fill="currentColor"
      d="M18.7808 9.19434L16.7505 4.31739C16.165 2.91114 14.8071 2.00098 13.29 2.00001H4.25C3.00928 2.00001 2 3.00978 2 4.25099V9.75099C2 10.9912 3.00928 12.001 4.25 12.001H6.31592C7.30567 12.0039 7.60205 13.2471 7.94043 15.1445C8.22119 16.7178 8.53906 18.5 10.0649 18.5C11.9155 18.5 12.1279 17.0293 12.2441 16.2246C12.2456 16.2129 12.4502 13.6895 12.4502 13.6895C12.4819 13.3037 12.8101 13.001 13.1973 13.001H16.2422C17.1636 13.001 18.019 12.543 18.5303 11.7764C19.0415 11.0098 19.1353 10.0449 18.7808 9.19434ZM3.5 9.75098V4.25098C3.5 3.83692 3.83643 3.5 4.25 3.5H5.25V10.501H4.25C3.83643 10.501 3.5 10.1641 3.5 9.75098ZM17.2822 10.9443C17.0464 11.2979 16.6675 11.501 16.2422 11.501H13.1973C12.0352 11.501 11.0503 12.4082 10.9551 13.5674C10.9551 13.5674 10.7603 15.9814 10.7578 16.0244C10.6167 17 10.4985 16.9863 10.0444 16.998C9.77588 16.8916 9.53369 15.5342 9.41699 14.8809C9.10949 13.1562 8.69446 10.8372 6.75 10.5352V3.5H13.2895C14.1987 3.50098 15.0137 4.04785 15.3657 4.89355L17.396 9.7705C17.5596 10.1631 17.5181 10.5908 17.2822 10.9443Z"
    />
  </svg>
`;

// deps/swc/swc-dist/patterns/conversational-ai/message-feedback/message-feedback.js
var t5 = i`:host{display:inline-block}*,*:before,*:after{box-sizing:border-box}.swc-MessageFeedback{display:inline-flex;gap:var(--swc-message-feedback-gap, 8px);align-items:center}.swc-MessageFeedback-button{display:flex;align-items:center;justify-content:center;inline-size:var(--swc-message-feedback-button-inline-size, 32px);block-size:var(--swc-message-feedback-button-block-size, 32px);padding:0;color:var(--swc-gray-800);background:transparent;border:1px solid transparent;border-radius:var(--swc-message-feedback-button-border-radius, 6px);transition:background .13s ease,color .13s ease}.swc-MessageFeedback-button:hover,.swc-MessageFeedback-button:focus-visible{color:var(--swc-gray-800);background:var(--swc-gray-200)}.swc-MessageFeedback-button:focus-visible{outline:2px solid var(--swc-blue-800);outline-offset:2px}.swc-MessageFeedback-button[aria-pressed=true]{color:var(--swc-gray-25);background:var(--swc-gray-800)}.swc-MessageFeedback-button[aria-pressed=true]:hover{background:var(--swc-gray-900)}@media(forced-colors:active){.swc-MessageFeedback-button[aria-pressed=true],.swc-MessageFeedback-button[aria-pressed=true]:hover{color:SelectedItemText;background:SelectedItem}.swc-MessageFeedback-button[aria-pressed=true]:hover{border-color:Highlight}}`;

// deps/swc/swc-dist/core/controllers/focusgroup-navigation-controller/src/focusgroup-navigation-controller.js
var e13 = {
  wrap: false,
  memory: true,
  skipDisabled: false
};
var t7 = 6;
var n9 = "swc-focusgroup-navigation-active-change";
var r8 = class {
  constructor(t8, n11) {
    this.boundKeydown = this.handleKeydown.bind(this), this.boundFocusin = this.handleFocusin.bind(this), this.boundFocusout = this.handleFocusout.bind(this), this.lastFocused = null, this.previousActive = null, this.isNavigating = false, this.cachedEligibleItems = null, this.cachedRows = null, this.host = t8, this.options = {
      ...e13,
      ...n11
    }, t8.addController(this);
  }
  setOptions(e16) {
    this.options = {
      ...this.options,
      ...e16
    }, this.refresh();
  }
  getActiveItem() {
    for (let e16 of this.getEligibleItems()) if (e16.tabIndex === 0) return e16;
    return null;
  }
  refresh() {
    var e16, t8;
    this.cachedEligibleItems = null, this.cachedRows = null;
    let n11 = this.getEligibleItems();
    if (n11.length === 0) {
      for (let e17 of this.getRawItems()) e17.tabIndex = -1;
      if (this.lastFocused = null, this.previousActive !== null) {
        var r9, i9;
        this.previousActive = null, this.dispatchActiveChange(null), (r9 = (i9 = this.options).onActiveItemChange) == null || r9.call(i9, null);
      }
      return;
    }
    let a6 = (e16 = (t8 = this.options.memory && this.lastFocused && n11.includes(this.lastFocused) ? this.lastFocused : null) == null ? this.getActiveItem() : t8) == null ? n11[0] : e16;
    this.applyRovingTabindex(a6);
  }
  setActiveItem(e16) {
    return this.getEligibleItems().includes(e16) ? (this.applyRovingTabindex(e16), this.options.memory && (this.lastFocused = e16), true) : false;
  }
  focusFirstItemByTextPrefix(e16) {
    let t8 = e16.trim();
    if (t8 === "") return false;
    let n11 = t8.toLowerCase(), r9 = this.getEligibleItems().find((e17) => this.getItemTypeaheadLabel(e17).toLowerCase().startsWith(n11));
    return r9 ? (this.applyRovingTabindex(r9), true) : false;
  }
  hostConnected() {
    this.previousActive = null, this.cachedEligibleItems = null, this.cachedRows = null, this.host.addEventListener("keydown", this.boundKeydown, true), this.host.addEventListener("focusin", this.boundFocusin, true), this.host.addEventListener("focusout", this.boundFocusout, true), this.refresh();
  }
  hostDisconnected() {
    this.host.removeEventListener("keydown", this.boundKeydown, true), this.host.removeEventListener("focusin", this.boundFocusin, true), this.host.removeEventListener("focusout", this.boundFocusout, true);
  }
  isRtl() {
    return getComputedStyle(this.host).direction === "rtl";
  }
  isNodeWithinHostScope(e16) {
    if (!e16) return false;
    let t8 = this.host, n11 = e16;
    for (; n11; ) {
      if (n11 === t8) return true;
      let e17 = n11.parentNode;
      if (e17) n11 = e17;
      else if (n11 instanceof ShadowRoot) n11 = n11.host;
      else return false;
    }
    return false;
  }
  getRawItems() {
    return this.options.getItems().filter((e16) => this.isNodeWithinHostScope(e16));
  }
  getEligibleItems() {
    return this.cachedEligibleItems || (this.cachedEligibleItems = this.getRawItems().filter((e16) => this.isNavigableItem(e16))), this.cachedEligibleItems;
  }
  getRows(e16) {
    return this.cachedRows || (this.cachedRows = this.buildRows(e16)), this.cachedRows;
  }
  isNavigableItem(e16) {
    if (!e16.isConnected || e16.hasAttribute("inert") || e16.closest("[inert]")) return false;
    let t8 = getComputedStyle(e16);
    return !(t8.visibility === "hidden" || t8.display === "none" || this.options.skipDisabled && this.isDisabledForSkip(e16));
  }
  isDisabledForSkip(e16) {
    return "disabled" in e16 && e16.disabled ? true : e16.getAttribute("aria-disabled") === "true";
  }
  getItemTypeaheadLabel(e16) {
    var t8, n11, r9, i9;
    let a6 = (t8 = e16.getAttribute("aria-label")) == null ? void 0 : t8.trim();
    if (a6) return a6;
    let o14 = (n11 = e16.getAttribute("aria-labelledby")) == null ? void 0 : n11.trim();
    if (o14) {
      let t9 = e16.getRootNode(), n12 = [];
      for (let r11 of o14.split(/\s+/)) {
        var s6, c4;
        if (!r11) continue;
        let i10 = t9 instanceof ShadowRoot ? (s6 = t9.getElementById(r11)) == null ? e16.ownerDocument.getElementById(r11) : s6 : e16.ownerDocument.getElementById(r11), a7 = i10 == null || (c4 = i10.textContent) == null ? void 0 : c4.trim();
        a7 && n12.push(a7);
      }
      let r10 = n12.join(" ").trim();
      if (r10) return r10;
    }
    return (r9 = (i9 = e16.textContent) == null ? void 0 : i9.trim()) == null ? "" : r9;
  }
  isNativelyDisabled(e16) {
    return "disabled" in e16 && e16.disabled === true;
  }
  applyRovingTabindex(e16) {
    let t8 = this.getEligibleItems(), n11 = new Set(t8);
    for (let e17 of this.getRawItems()) n11.has(e17) || (e17.tabIndex = -1);
    if (t8.length === 0) return;
    let r9 = n11.has(e16) ? e16 : t8[0];
    if (this.isNativelyDisabled(r9)) {
      var i9;
      r9 = (i9 = t8.find((e17) => !this.isNativelyDisabled(e17))) == null ? r9 : i9;
    }
    for (let e17 of t8) e17 === r9 ? e17.tabIndex = 0 : e17.tabIndex = -1;
    if (r9 !== this.previousActive) {
      var a6, o14;
      this.previousActive = r9, this.dispatchActiveChange(r9), (a6 = (o14 = this.options).onActiveItemChange) == null || a6.call(o14, r9);
    }
  }
  dispatchActiveChange(e16) {
    this.host.dispatchEvent(new CustomEvent(n9, {
      bubbles: true,
      composed: true,
      detail: { activeElement: e16 }
    }));
  }
  resolveManagedFocusTarget(e16, t8) {
    if (t8.length === 0) return null;
    let n11 = new Set(t8);
    for (let t9 of e16.composedPath()) if (t9 instanceof HTMLElement) {
      if (n11.has(t9)) return t9;
      if (t9 === this.host) break;
    }
    let r9 = this.host.shadowRoot, i9 = r9 == null ? void 0 : r9.activeElement;
    return i9 instanceof HTMLElement && n11.has(i9) ? i9 : null;
  }
  handleFocusin(e16) {
    if (this.isNavigating) return;
    this.cachedEligibleItems = null, this.cachedRows = null;
    let t8 = this.getEligibleItems(), n11 = this.resolveManagedFocusTarget(e16, t8);
    n11 && (this.applyRovingTabindex(n11), this.options.memory && (this.lastFocused = n11));
  }
  handleFocusout(e16) {
    let t8 = e16.relatedTarget;
    if (t8 instanceof Node && this.isNodeWithinHostScope(t8)) return;
    let n11 = e16.target;
    if (this.options.memory && n11 instanceof HTMLElement && this.getRawItems().includes(n11) && (this.lastFocused = n11), !this.options.memory) {
      this.cachedEligibleItems = null, this.cachedRows = null;
      let e17 = this.getEligibleItems();
      e17.length > 0 && this.applyRovingTabindex(e17[0]);
    }
  }
  resolveManagedKeydownTarget(e16, t8) {
    if (t8.length === 0) return null;
    let n11 = new Set(t8);
    for (let t9 of e16.composedPath()) if (t9 instanceof HTMLElement) {
      if (n11.has(t9)) return t9;
      if (t9 === this.host) break;
    }
    let r9 = this.host.shadowRoot, i9 = r9 == null ? void 0 : r9.activeElement;
    return i9 instanceof HTMLElement && n11.has(i9) ? i9 : null;
  }
  handleKeydown(e16) {
    if (e16.defaultPrevented || e16.altKey) return;
    this.cachedEligibleItems = null, this.cachedRows = null;
    let t8 = this.getEligibleItems(), n11 = this.resolveManagedKeydownTarget(e16, t8);
    if (!n11) return;
    let r9 = this.options.direction === "grid", i9 = r9 ? this.getRows(t8) : null;
    if (r9 && e16.ctrlKey && !e16.metaKey && (e16.key === "Home" || e16.key === "End")) {
      if (i9.length > 0) {
        var a6, o14;
        let t9 = i9[0], r10 = i9[i9.length - 1], s7 = e16.key === "Home" ? (a6 = t9 == null ? void 0 : t9[0]) == null ? null : a6 : (o14 = r10 == null ? void 0 : r10[r10.length - 1]) == null ? null : o14;
        s7 && s7 !== n11 && (e16.preventDefault(), this.moveKeyNavigationFocusTo(s7));
      }
      return;
    }
    if (e16.ctrlKey || e16.metaKey) return;
    let s6 = this.getEffectivePageMagnitude();
    if (s6 !== null && (e16.key === "PageUp" || e16.key === "PageDown")) {
      let r10 = this.navigatePage(t8, n11, e16.key === "PageDown" ? s6 : -s6, i9);
      r10 && r10 !== n11 && (e16.preventDefault(), this.moveKeyNavigationFocusTo(r10));
      return;
    }
    let c4 = this.isRtl(), l5 = null;
    switch (this.options.direction) {
      case "horizontal":
        l5 = this.navigateLinear(t8, n11, e16.key, "horizontal", c4);
        break;
      case "vertical":
        l5 = this.navigateLinear(t8, n11, e16.key, "vertical", c4);
        break;
      case "both":
        l5 = this.navigateBothAxes(t8, n11, e16.key, c4);
        break;
      case "grid":
        l5 = this.navigateGrid(n11, e16.key, c4, i9);
        break;
      default:
        break;
    }
    if (l5 && l5 !== n11) {
      e16.preventDefault(), this.moveKeyNavigationFocusTo(l5);
      return;
    }
    if (e16.key === "Home" || e16.key === "End") if (r9) {
      let t9 = this.findGridIndex(i9, n11);
      if (!t9) return;
      let r10 = i9[t9.row];
      if (!(r10 != null && r10.length)) return;
      let a7 = e16.key === "Home" ? r10[0] : r10[r10.length - 1];
      a7 && a7 !== n11 && (e16.preventDefault(), this.moveKeyNavigationFocusTo(a7));
    } else {
      if (t8.length === 0) return;
      let r10 = e16.key === "Home" ? t8[0] : t8[t8.length - 1];
      r10 && r10 !== n11 && (e16.preventDefault(), this.moveKeyNavigationFocusTo(r10));
    }
  }
  moveKeyNavigationFocusTo(e16) {
    this.isNavigating = true;
    try {
      this.setActiveItem(e16) && e16.focus();
    } finally {
      this.isNavigating = false;
    }
  }
  getEffectivePageMagnitude() {
    let e16 = this.options.pageStep;
    if (e16 === void 0) return null;
    let t8 = Math.trunc(Number(e16));
    return !Number.isFinite(t8) || t8 === 0 ? null : Math.abs(t8);
  }
  navigatePage(e16, t8, n11, r9) {
    return this.options.direction === "grid" ? this.navigatePageGridRows(t8, n11, r9) : this.navigatePageLinearItems(e16, t8, n11);
  }
  navigatePageLinearItems(e16, t8, n11) {
    var r9;
    let i9 = e16.indexOf(t8);
    if (i9 < 0 || e16.length === 0) return null;
    let a6 = i9 + n11;
    if (this.options.wrap) {
      let t9 = e16.length;
      a6 = (a6 % t9 + t9) % t9;
    } else a6 = Math.max(0, Math.min(e16.length - 1, a6));
    return (r9 = e16[a6]) == null ? null : r9;
  }
  navigatePageGridRows(e16, t8, n11) {
    var r9;
    if (n11.length === 0) return null;
    let i9 = this.findGridIndex(n11, e16);
    if (!i9) return null;
    let { row: a6, col: o14 } = i9, s6 = a6 + t8;
    if (this.options.wrap) {
      let e17 = n11.length;
      s6 = (s6 % e17 + e17) % e17;
    } else s6 = Math.max(0, Math.min(n11.length - 1, s6));
    let c4 = n11[s6];
    return c4 != null && c4.length ? (r9 = c4[Math.min(o14, c4.length - 1)]) == null ? null : r9 : null;
  }
  navigateLinear(e16, t8, n11, r9, i9) {
    var a6;
    let o14 = e16.indexOf(t8);
    if (o14 < 0) return null;
    let s6 = 0;
    if (r9 === "horizontal" ? n11 === "ArrowLeft" ? s6 = i9 ? 1 : -1 : n11 === "ArrowRight" && (s6 = i9 ? -1 : 1) : n11 === "ArrowUp" ? s6 = -1 : n11 === "ArrowDown" && (s6 = 1), s6 === 0) return null;
    let c4 = o14 + s6;
    if (this.options.wrap) c4 = (c4 + e16.length) % e16.length;
    else if (c4 < 0 || c4 >= e16.length) return null;
    return (a6 = e16[c4]) == null ? null : a6;
  }
  navigateBothAxes(e16, t8, n11, r9) {
    var i9;
    let a6 = e16.indexOf(t8);
    if (a6 < 0) return null;
    let o14 = 0;
    if (n11 === "ArrowLeft" ? o14 = r9 ? 1 : -1 : n11 === "ArrowRight" ? o14 = r9 ? -1 : 1 : n11 === "ArrowUp" ? o14 = -1 : n11 === "ArrowDown" && (o14 = 1), o14 === 0) return null;
    let s6 = a6 + o14;
    if (this.options.wrap) s6 = (s6 + e16.length) % e16.length;
    else if (s6 < 0 || s6 >= e16.length) return null;
    return (i9 = e16[s6]) == null ? null : i9;
  }
  navigateGrid(e16, t8, n11, r9) {
    var i9, a6;
    let o14 = this.findGridIndex(r9, e16);
    if (!o14) return null;
    let { row: s6, col: c4 } = o14, l5 = (i9 = r9[s6]) == null ? [] : i9, u3 = s6, d4 = c4;
    switch (t8) {
      case "ArrowLeft":
        d4 = n11 ? c4 + 1 : c4 - 1;
        break;
      case "ArrowRight":
        d4 = n11 ? c4 - 1 : c4 + 1;
        break;
      case "ArrowUp":
        u3 = s6 - 1;
        break;
      case "ArrowDown":
        u3 = s6 + 1;
        break;
      default:
        return null;
    }
    if (t8 === "ArrowLeft" || t8 === "ArrowRight") {
      if (d4 >= 0 && d4 < l5.length) {
        var f3;
        return (f3 = l5[d4]) == null ? null : f3;
      }
      if (this.options.wrap && l5.length > 0) {
        var p3;
        return (p3 = l5[(d4 + l5.length) % l5.length]) == null ? null : p3;
      }
      return null;
    }
    if (u3 < 0 || u3 >= r9.length) if (this.options.wrap && r9.length > 0) u3 = (u3 + r9.length) % r9.length;
    else return null;
    let m2 = r9[u3];
    return m2 != null && m2.length ? (a6 = m2[Math.min(c4, m2.length - 1)]) == null ? null : a6 : null;
  }
  buildRows(e16) {
    let n11 = [];
    for (let r9 of e16) {
      let e17 = r9.getBoundingClientRect().top, i9 = n11.find((n12) => Math.abs(n12.top - e17) <= t7);
      i9 || (i9 = {
        top: e17,
        elements: []
      }, n11.push(i9)), i9.elements.push(r9);
    }
    return n11.sort((e17, t8) => e17.top - t8.top), n11.map((e17) => e17.elements.sort((e18, t8) => e18.getBoundingClientRect().left - t8.getBoundingClientRect().left));
  }
  findGridIndex(e16, t8) {
    for (let n11 = 0; n11 < e16.length; n11++) {
      let r9 = e16[n11].indexOf(t8);
      if (r9 !== -1) return {
        row: n11,
        col: r9
      };
    }
    return null;
  }
};

// deps/swc/swc-dist/patterns/conversational-ai/message-feedback/MessageFeedback.js
var l4 = class extends o7 {
  constructor(...e16) {
    super(...e16), this.groupLabel = "Response feedback", this.positiveLabel = "Positive response", this.negativeLabel = "Negative response", this.focusgroupNavigationController = new r8(this, {
      direction: "both",
      wrap: true,
      getItems: () => this._feedbackButtons()
    });
  }
  static get styles() {
    return [t5];
  }
  _feedbackButtons() {
    var e16;
    return Array.from((e16 = this._feedbackButtonNodes) == null ? [] : e16);
  }
  updated(e16) {
    super.updated(e16), this._syncRovingFocusTarget();
  }
  _syncRovingFocusTarget() {
    this.focusgroupNavigationController.refresh();
    let e16 = this._feedbackButtons();
    if (!e16.length) return;
    let t8 = this.status === "negative" ? e16[1] : e16[0];
    this.focusgroupNavigationController.setActiveItem(t8);
  }
  _toggleStatus(e16) {
    let t8 = this.status === e16 ? void 0 : e16;
    this.dispatchEvent(new CustomEvent("swc-message-feedback-change", {
      bubbles: true,
      composed: true,
      detail: { status: t8 }
    }));
  }
  _handlePositiveClick() {
    this._toggleStatus("positive");
  }
  _handleNegativeClick() {
    this._toggleStatus("negative");
  }
  render() {
    return b2`
      <div
        class="swc-MessageFeedback"
        role="group"
        aria-label=${this.groupLabel}
      >
        <button
          type="button"
          class="swc-MessageFeedback-button"
          aria-label=${this.positiveLabel}
          aria-pressed=${this.status === "positive"}
          @click=${this._handlePositiveClick}
        >
          <swc-icon aria-hidden="true">${o12()}</swc-icon>
        </button>
        <button
          type="button"
          class="swc-MessageFeedback-button"
          aria-label=${this.negativeLabel}
          aria-pressed=${this.status === "negative"}
          @click=${this._handleNegativeClick}
        >
          <swc-icon aria-hidden="true">${s5()}</swc-icon>
        </button>
      </div>
    `;
  }
};
e([n4({
  type: String,
  reflect: true
})], l4.prototype, "status", void 0), e([n4({
  type: String,
  attribute: "group-label"
})], l4.prototype, "groupLabel", void 0), e([n4({
  type: String,
  attribute: "positive-label"
})], l4.prototype, "positiveLabel", void 0), e([n4({
  type: String,
  attribute: "negative-label"
})], l4.prototype, "negativeLabel", void 0), e([r5(".swc-MessageFeedback-button")], l4.prototype, "_feedbackButtonNodes", void 0);

// deps/swc/swc-dist/patterns/conversational-ai/message-feedback/index.js
e9("swc-message-feedback", l4);
export {
  l4 as MessageFeedback
};
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
@lit/reactive-element/decorators/custom-element.js:
@lit/reactive-element/decorators/property.js:
@lit/reactive-element/decorators/state.js:
@lit/reactive-element/decorators/event-options.js:
@lit/reactive-element/decorators/base.js:
@lit/reactive-element/decorators/query.js:
@lit/reactive-element/decorators/query-all.js:
@lit/reactive-element/decorators/query-async.js:
@lit/reactive-element/decorators/query-assigned-nodes.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-elements.js:
@lit-labs/observers/mutation-controller.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
