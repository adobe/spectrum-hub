// deps/swc/swc-dist/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e(e13, t8, n10, r7) {
  var i9 = arguments.length, a5 = i9 < 3 ? t8 : r7 === null ? r7 = Object.getOwnPropertyDescriptor(t8, n10) : r7, o11;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e13, t8, n10, r7);
  else for (var s7 = e13.length - 1; s7 >= 0; s7--) (o11 = e13[s7]) && (a5 = (i9 < 3 ? o11(a5) : i9 > 3 ? o11(t8, n10, a5) : o11(t8, n10)) || a5);
  return i9 > 3 && a5 && Object.defineProperty(t8, n10, a5), a5;
}

// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e2 = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t8, e13, o11) {
    if (this._$cssResult$ = true, o11 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t8, this.t = e13;
  }
  get styleSheet() {
    let t8 = this.o;
    const s7 = this.t;
    if (e2 && void 0 === t8) {
      const e13 = void 0 !== s7 && 1 === s7.length;
      e13 && (t8 = o.get(s7)), void 0 === t8 && ((this.o = t8 = new CSSStyleSheet()).replaceSync(this.cssText), e13 && o.set(s7, t8));
    }
    return t8;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t8) => new n("string" == typeof t8 ? t8 : t8 + "", void 0, s);
var i = (t8, ...e13) => {
  const o11 = 1 === t8.length ? t8[0] : e13.reduce((e14, s7, o12) => e14 + ((t9) => {
    if (true === t9._$cssResult$) return t9.cssText;
    if ("number" == typeof t9) return t9;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t9 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s7) + t8[o12 + 1], t8[0]);
  return new n(o11, t8, s);
};
var S = (s7, o11) => {
  if (e2) s7.adoptedStyleSheets = o11.map((t8) => t8 instanceof CSSStyleSheet ? t8 : t8.styleSheet);
  else for (const e13 of o11) {
    const o12 = document.createElement("style"), n10 = t.litNonce;
    void 0 !== n10 && o12.setAttribute("nonce", n10), o12.textContent = e13.cssText, s7.appendChild(o12);
  }
};
var c = e2 ? (t8) => t8 : (t8) => t8 instanceof CSSStyleSheet ? ((t9) => {
  let e13 = "";
  for (const s7 of t9.cssRules) e13 += s7.cssText;
  return r(e13);
})(t8) : t8;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e3, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t8, s7) => t8;
var u = { toAttribute(t8, s7) {
  switch (s7) {
    case Boolean:
      t8 = t8 ? l : null;
      break;
    case Object:
    case Array:
      t8 = null == t8 ? t8 : JSON.stringify(t8);
  }
  return t8;
}, fromAttribute(t8, s7) {
  let i9 = t8;
  switch (s7) {
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
var f = (t8, s7) => !i2(t8, s7);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t8) {
    this._$Ei(), (this.l ??= []).push(t8);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t8, s7 = b) {
    if (s7.state && (s7.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t8) && ((s7 = Object.create(s7)).wrapped = true), this.elementProperties.set(t8, s7), !s7.noAccessor) {
      const i9 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t8, i9, s7);
      void 0 !== h3 && e3(this.prototype, t8, h3);
    }
  }
  static getPropertyDescriptor(t8, s7, i9) {
    const { get: e13, set: r7 } = h(this.prototype, t8) ?? { get() {
      return this[s7];
    }, set(t9) {
      this[s7] = t9;
    } };
    return { get: e13, set(s8) {
      const h3 = e13?.call(this);
      r7?.call(this, s8), this.requestUpdate(t8, h3, i9);
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
      const t9 = this.properties, s7 = [...r2(t9), ...o2(t9)];
      for (const i9 of s7) this.createProperty(i9, t9[i9]);
    }
    const t8 = this[Symbol.metadata];
    if (null !== t8) {
      const s7 = litPropertyMetadata.get(t8);
      if (void 0 !== s7) for (const [t9, i9] of s7) this.elementProperties.set(t9, i9);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t9, s7] of this.elementProperties) {
      const i9 = this._$Eu(t9, s7);
      void 0 !== i9 && this._$Eh.set(i9, t9);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s7) {
    const i9 = [];
    if (Array.isArray(s7)) {
      const e13 = new Set(s7.flat(1 / 0).reverse());
      for (const s8 of e13) i9.unshift(c(s8));
    } else void 0 !== s7 && i9.push(c(s7));
    return i9;
  }
  static _$Eu(t8, s7) {
    const i9 = s7.attribute;
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
    const t8 = /* @__PURE__ */ new Map(), s7 = this.constructor.elementProperties;
    for (const i9 of s7.keys()) this.hasOwnProperty(i9) && (t8.set(i9, this[i9]), delete this[i9]);
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
  attributeChangedCallback(t8, s7, i9) {
    this._$AK(t8, i9);
  }
  _$ET(t8, s7) {
    const i9 = this.constructor.elementProperties.get(t8), e13 = this.constructor._$Eu(t8, i9);
    if (void 0 !== e13 && true === i9.reflect) {
      const h3 = (void 0 !== i9.converter?.toAttribute ? i9.converter : u).toAttribute(s7, i9.type);
      this._$Em = t8, null == h3 ? this.removeAttribute(e13) : this.setAttribute(e13, h3), this._$Em = null;
    }
  }
  _$AK(t8, s7) {
    const i9 = this.constructor, e13 = i9._$Eh.get(t8);
    if (void 0 !== e13 && this._$Em !== e13) {
      const t9 = i9.getPropertyOptions(e13), h3 = "function" == typeof t9.converter ? { fromAttribute: t9.converter } : void 0 !== t9.converter?.fromAttribute ? t9.converter : u;
      this._$Em = e13;
      const r7 = h3.fromAttribute(s7, t9.type);
      this[e13] = r7 ?? this._$Ej?.get(e13) ?? r7, this._$Em = null;
    }
  }
  requestUpdate(t8, s7, i9, e13 = false, h3) {
    if (void 0 !== t8) {
      const r7 = this.constructor;
      if (false === e13 && (h3 = this[t8]), i9 ??= r7.getPropertyOptions(t8), !((i9.hasChanged ?? f)(h3, s7) || i9.useDefault && i9.reflect && h3 === this._$Ej?.get(t8) && !this.hasAttribute(r7._$Eu(t8, i9)))) return;
      this.C(t8, s7, i9);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t8, s7, { useDefault: i9, reflect: e13, wrapped: h3 }, r7) {
    i9 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t8) && (this._$Ej.set(t8, r7 ?? s7 ?? this[t8]), true !== h3 || void 0 !== r7) || (this._$AL.has(t8) || (this.hasUpdated || i9 || (s7 = void 0), this._$AL.set(t8, s7)), true === e13 && this._$Em !== t8 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t8));
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
        for (const [t10, s8] of this._$Ep) this[t10] = s8;
        this._$Ep = void 0;
      }
      const t9 = this.constructor.elementProperties;
      if (t9.size > 0) for (const [s8, i9] of t9) {
        const { wrapped: t10 } = i9, e13 = this[s8];
        true !== t10 || this._$AL.has(s8) || void 0 === e13 || this.C(s8, void 0, i9, e13);
      }
    }
    let t8 = false;
    const s7 = this._$AL;
    try {
      t8 = this.shouldUpdate(s7), t8 ? (this.willUpdate(s7), this._$EO?.forEach((t9) => t9.hostUpdate?.()), this.update(s7)) : this._$EM();
    } catch (s8) {
      throw t8 = false, this._$EM(), s8;
    }
    t8 && this._$AE(s7);
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
var x = (t8) => (i9, ...s7) => ({ _$litType$: t8, strings: i9, values: s7 });
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
  const s7 = t8.length - 1, e13 = [];
  let n10, l5 = 2 === i9 ? "<svg>" : 3 === i9 ? "<math>" : "", c6 = v;
  for (let i10 = 0; i10 < s7; i10++) {
    const s8 = t8[i10];
    let a5, u5, d4 = -1, f3 = 0;
    for (; f3 < s8.length && (c6.lastIndex = f3, u5 = c6.exec(s8), null !== u5); ) f3 = c6.lastIndex, c6 === v ? "!--" === u5[1] ? c6 = _ : void 0 !== u5[1] ? c6 = m : void 0 !== u5[2] ? (y2.test(u5[2]) && (n10 = RegExp("</" + u5[2], "g")), c6 = p2) : void 0 !== u5[3] && (c6 = p2) : c6 === p2 ? ">" === u5[0] ? (c6 = n10 ?? v, d4 = -1) : void 0 === u5[1] ? d4 = -2 : (d4 = c6.lastIndex - u5[2].length, a5 = u5[1], c6 = void 0 === u5[3] ? p2 : '"' === u5[3] ? $ : g) : c6 === $ || c6 === g ? c6 = p2 : c6 === _ || c6 === m ? c6 = v : (c6 = p2, n10 = void 0);
    const x2 = c6 === p2 && t8[i10 + 1].startsWith("/>") ? " " : "";
    l5 += c6 === v ? s8 + r3 : d4 >= 0 ? (e13.push(a5), s8.slice(0, d4) + h2 + s8.slice(d4) + o3 + x2) : s8 + o3 + (-2 === d4 ? i10 : x2);
  }
  return [V(t8, l5 + (t8[s7] || "<?>") + (2 === i9 ? "</svg>" : 3 === i9 ? "</math>" : "")), e13];
};
var S2 = class _S {
  constructor({ strings: t8, _$litType$: i9 }, e13) {
    let r7;
    this.parts = [];
    let l5 = 0, a5 = 0;
    const u5 = t8.length - 1, d4 = this.parts, [f3, v2] = N(t8, i9);
    if (this.el = _S.createElement(f3, e13), P.currentNode = this.el.content, 2 === i9 || 3 === i9) {
      const t9 = this.el.content.firstChild;
      t9.replaceWith(...t9.childNodes);
    }
    for (; null !== (r7 = P.nextNode()) && d4.length < u5; ) {
      if (1 === r7.nodeType) {
        if (r7.hasAttributes()) for (const t9 of r7.getAttributeNames()) if (t9.endsWith(h2)) {
          const i10 = v2[a5++], s7 = r7.getAttribute(t9).split(o3), e14 = /([.?@])?(.*)/.exec(i10);
          d4.push({ type: 1, index: l5, name: e14[2], strings: s7, ctor: "." === e14[1] ? I : "?" === e14[1] ? L : "@" === e14[1] ? z : H }), r7.removeAttribute(t9);
        } else t9.startsWith(o3) && (d4.push({ type: 6, index: l5 }), r7.removeAttribute(t9));
        if (y2.test(r7.tagName)) {
          const t9 = r7.textContent.split(o3), i10 = t9.length - 1;
          if (i10 > 0) {
            r7.textContent = s2 ? s2.emptyScript : "";
            for (let s7 = 0; s7 < i10; s7++) r7.append(t9[s7], c3()), P.nextNode(), d4.push({ type: 2, index: ++l5 });
            r7.append(t9[i10], c3());
          }
        }
      } else if (8 === r7.nodeType) if (r7.data === n3) d4.push({ type: 2, index: l5 });
      else {
        let t9 = -1;
        for (; -1 !== (t9 = r7.data.indexOf(o3, t9 + 1)); ) d4.push({ type: 7, index: l5 }), t9 += o3.length - 1;
      }
      l5++;
    }
  }
  static createElement(t8, i9) {
    const s7 = l2.createElement("template");
    return s7.innerHTML = t8, s7;
  }
};
function M(t8, i9, s7 = t8, e13) {
  if (i9 === E) return i9;
  let h3 = void 0 !== e13 ? s7._$Co?.[e13] : s7._$Cl;
  const o11 = a2(i9) ? void 0 : i9._$litDirective$;
  return h3?.constructor !== o11 && (h3?._$AO?.(false), void 0 === o11 ? h3 = void 0 : (h3 = new o11(t8), h3._$AT(t8, s7, e13)), void 0 !== e13 ? (s7._$Co ??= [])[e13] = h3 : s7._$Cl = h3), void 0 !== h3 && (i9 = M(t8, h3._$AS(t8, i9.values), h3, e13)), i9;
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
    const { el: { content: i9 }, parts: s7 } = this._$AD, e13 = (t8?.creationScope ?? l2).importNode(i9, true);
    P.currentNode = e13;
    let h3 = P.nextNode(), o11 = 0, n10 = 0, r7 = s7[0];
    for (; void 0 !== r7; ) {
      if (o11 === r7.index) {
        let i10;
        2 === r7.type ? i10 = new k(h3, h3.nextSibling, this, t8) : 1 === r7.type ? i10 = new r7.ctor(h3, r7.name, r7.strings, this, t8) : 6 === r7.type && (i10 = new Z(h3, this, t8)), this._$AV.push(i10), r7 = s7[++n10];
      }
      o11 !== r7?.index && (h3 = P.nextNode(), o11++);
    }
    return P.currentNode = l2, e13;
  }
  p(t8) {
    let i9 = 0;
    for (const s7 of this._$AV) void 0 !== s7 && (void 0 !== s7.strings ? (s7._$AI(t8, s7, i9), i9 += s7.strings.length - 2) : s7._$AI(t8[i9])), i9++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t8, i9, s7, e13) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t8, this._$AB = i9, this._$AM = s7, this.options = e13, this._$Cv = e13?.isConnected ?? true;
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
    const { values: i9, _$litType$: s7 } = t8, e13 = "number" == typeof s7 ? this._$AC(t8) : (void 0 === s7.el && (s7.el = S2.createElement(V(s7.h, s7.h[0]), this.options)), s7);
    if (this._$AH?._$AD === e13) this._$AH.p(i9);
    else {
      const t9 = new R(e13, this), s8 = t9.u(this.options);
      t9.p(i9), this.T(s8), this._$AH = t9;
    }
  }
  _$AC(t8) {
    let i9 = C.get(t8.strings);
    return void 0 === i9 && C.set(t8.strings, i9 = new S2(t8)), i9;
  }
  k(t8) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i9 = this._$AH;
    let s7, e13 = 0;
    for (const h3 of t8) e13 === i9.length ? i9.push(s7 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s7 = i9[e13], s7._$AI(h3), e13++;
    e13 < i9.length && (this._$AR(s7 && s7._$AB.nextSibling, e13), i9.length = e13);
  }
  _$AR(t8 = this._$AA.nextSibling, s7) {
    for (this._$AP?.(false, true, s7); t8 !== this._$AB; ) {
      const s8 = i3(t8).nextSibling;
      i3(t8).remove(), t8 = s8;
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
  constructor(t8, i9, s7, e13, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t8, this.name = i9, this._$AM = e13, this.options = h3, s7.length > 2 || "" !== s7[0] || "" !== s7[1] ? (this._$AH = Array(s7.length - 1).fill(new String()), this.strings = s7) : this._$AH = A;
  }
  _$AI(t8, i9 = this, s7, e13) {
    const h3 = this.strings;
    let o11 = false;
    if (void 0 === h3) t8 = M(this, t8, i9, 0), o11 = !a2(t8) || t8 !== this._$AH && t8 !== E, o11 && (this._$AH = t8);
    else {
      const e14 = t8;
      let n10, r7;
      for (t8 = h3[0], n10 = 0; n10 < h3.length - 1; n10++) r7 = M(this, e14[s7 + n10], i9, n10), r7 === E && (r7 = this._$AH[n10]), o11 ||= !a2(r7) || r7 !== this._$AH[n10], r7 === A ? t8 = A : t8 !== A && (t8 += (r7 ?? "") + h3[n10 + 1]), this._$AH[n10] = r7;
    }
    o11 && !e13 && this.j(t8);
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
  constructor(t8, i9, s7, e13, h3) {
    super(t8, i9, s7, e13, h3), this.type = 5;
  }
  _$AI(t8, i9 = this) {
    if ((t8 = M(this, t8, i9, 0) ?? A) === E) return;
    const s7 = this._$AH, e13 = t8 === A && s7 !== A || t8.capture !== s7.capture || t8.once !== s7.once || t8.passive !== s7.passive, h3 = t8 !== A && (s7 === A || e13);
    e13 && this.element.removeEventListener(this.name, this, s7), h3 && this.element.addEventListener(this.name, this, t8), this._$AH = t8;
  }
  handleEvent(t8) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t8) : this._$AH.handleEvent(t8);
  }
};
var Z = class {
  constructor(t8, i9, s7) {
    this.element = t8, this.type = 6, this._$AN = void 0, this._$AM = i9, this.options = s7;
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
var D = (t8, i9, s7) => {
  const e13 = s7?.renderBefore ?? i9;
  let h3 = e13._$litPart$;
  if (void 0 === h3) {
    const t9 = s7?.renderBefore ?? null;
    e13._$litPart$ = h3 = new k(i9.insertBefore(c3(), t9), t9, void 0, s7 ?? {});
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
    const r7 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t8), this._$Do = D(r7, this.renderRoot, this.renderOptions);
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

// node_modules/lit-html/is-server.js
var o5 = false;

// deps/swc/swc-dist/stylesheets/_lit-styles/linear-progress-base.js
var t3 = i`:host{display:inline-block;inline-size:100%;min-inline-size:48px;max-inline-size:768px;vertical-align:top}*{box-sizing:border-box}.swc-LinearProgress{--_swc-linear-progress-corner-radius: calc(var(--swc-linear-progress-thickness, var(--swc-progress-bar-thickness-medium)) / 2);display:grid;position:relative;grid-template-areas:\"label value\" \"track track\" \"description description\";grid-template-columns:1fr auto;inline-size:100%}.swc-LinearProgress-label,.swc-LinearProgress-value{margin-block-start:var(--swc-linear-progress-top-to-text, 7px);margin-block-end:4px;font-size:var(--swc-linear-progress-font-size, var(--swc-font-size-100));line-height:1.3;color:var(--swc-linear-progress-text-color, var(--swc-gray-700));text-align:start;word-wrap:break-word;&:lang(ja),&:lang(zh),&:lang(ko){line-height:1.5}}.swc-LinearProgress-label{grid-area:label}.swc-LinearProgress-value{grid-area:value;justify-self:end;margin-inline-start:12px;font-feature-settings:\"tnum\";font-variant-numeric:tabular-nums;word-break:normal}.swc-LinearProgress-track{grid-area:track;inline-size:100%;block-size:var(--swc-linear-progress-thickness, var(--swc-progress-bar-thickness-medium));background:var(--swc-linear-progress-track-color, var(--swc-gray-300));border-radius:var(--_swc-linear-progress-corner-radius);overflow:hidden}.swc-LinearProgress-fill{min-inline-size:3%;block-size:var(--swc-linear-progress-thickness, var(--swc-progress-bar-thickness-medium));background:var(--swc-linear-progress-fill-color, var(--swc-accent-color-900));border:none;border-radius:var(--_swc-linear-progress-corner-radius);transition:inline-size 1s}.swc-LinearProgress-description{grid-area:description;margin-block-start:4px;font-size:var(--swc-linear-progress-font-size, var(--swc-font-size-100));line-height:1.3;color:var(--swc-linear-progress-text-color, var(--swc-gray-700))}:host([size=\"s\"]){--swc-linear-progress-thickness: var(--swc-progress-bar-thickness-small);--swc-linear-progress-font-size: var(--swc-font-size-75);--swc-linear-progress-top-to-text: 5px}:host([size=\"l\"]){--swc-linear-progress-thickness: var(--swc-progress-bar-thickness-large);--swc-linear-progress-font-size: var(--swc-font-size-200);--swc-linear-progress-top-to-text: 10px}:host([size=\"xl\"]){--swc-linear-progress-thickness: var(--swc-progress-bar-thickness-extra-large);--swc-linear-progress-font-size: var(--swc-font-size-300);--swc-linear-progress-top-to-text: 13px}:host([label-position=\"side\"]) .swc-LinearProgress{grid-template-areas:\"label track value\" \"description description description\";grid-template-columns:auto minmax(30%,1fr) auto;align-items:center}:host([label-position=\"side\"]) .swc-LinearProgress-label{grid-area:label;margin-block:0;margin-inline-end:12px}:host([label-position=\"side\"]) .swc-LinearProgress-value{grid-area:value;margin-block:0;margin-inline-start:12px;text-align:end}:host([static-color=\"white\"]) .swc-LinearProgress-track{background:var(--swc-transparent-white-300)}:host([static-color=\"white\"]) .swc-LinearProgress-fill{background:var(--swc-transparent-white-900)}:host([static-color=\"white\"]) .swc-LinearProgress-label,:host([static-color=\"white\"]) .swc-LinearProgress-value,:host([static-color=\"white\"]) .swc-LinearProgress-description{color:var(--swc-white)}:host([static-color=\"black\"]) .swc-LinearProgress-track{background:var(--swc-transparent-black-300)}:host([static-color=\"black\"]) .swc-LinearProgress-fill{background:var(--swc-transparent-black-900)}:host([static-color=\"black\"]) .swc-LinearProgress-label,:host([static-color=\"black\"]) .swc-LinearProgress-value,:host([static-color=\"black\"]) .swc-LinearProgress-description{color:var(--swc-black)}@media(prefers-reduced-motion:reduce){.swc-LinearProgress-fill{transition-duration:0ms}}@media(forced-colors:active){.swc-LinearProgress-track{background:ButtonFace;border:1px solid ButtonText;forced-color-adjust:none}.swc-LinearProgress-fill{background:ButtonText}}`;

// deps/swc/swc-dist/components/meter/meter.js
var t4 = i`:host([variant=\"positive\"]){--swc-linear-progress-fill-color: var(--swc-positive-visual-color)}:host([variant=\"notice\"]){--swc-linear-progress-fill-color: var(--swc-notice-visual-color)}:host([variant=\"negative\"]){--swc-linear-progress-fill-color: var(--swc-negative-visual-color)}`;

// node_modules/lit-html/directives/if-defined.js
var o6 = (o11) => o11 ?? A;

// node_modules/@lit/reactive-element/decorators/property.js
var o7 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t8 = o7, e13, r7) => {
  const { kind: n10, metadata: i9 } = r7;
  let s7 = globalThis.litPropertyMetadata.get(i9);
  if (void 0 === s7 && globalThis.litPropertyMetadata.set(i9, s7 = /* @__PURE__ */ new Map()), "setter" === n10 && ((t8 = Object.create(t8)).wrapped = true), s7.set(r7.name, t8), "accessor" === n10) {
    const { name: o11 } = r7;
    return { set(r8) {
      const n11 = e13.get.call(this);
      e13.set.call(this, r8), this.requestUpdate(o11, n11, t8, true, r8);
    }, init(e14) {
      return void 0 !== e14 && this.C(o11, void 0, t8, e14), e14;
    } };
  }
  if ("setter" === n10) {
    const { name: o11 } = r7;
    return function(r8) {
      const n11 = this[o11];
      e13.call(this, r8), this.requestUpdate(o11, n11, t8, true, r8);
    };
  }
  throw Error("Unsupported decorator location: " + n10);
};
function n4(t8) {
  return (e13, o11) => "object" == typeof o11 ? r4(t8, e13, o11) : ((t9, e14, o12) => {
    const r7 = e14.hasOwnProperty(o12);
    return e14.constructor.createProperty(o12, t9), r7 ? Object.getOwnPropertyDescriptor(e14, o12) : void 0;
  })(t8, e13, o11);
}

// deps/swc/swc-dist/core/components/meter/Meter.types.js
var e6 = [
  "informative",
  "positive",
  "notice",
  "negative"
];

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e7(e13, t8, n10, r7) {
  var i9 = arguments.length, a5 = i9 < 3 ? t8 : r7 === null ? r7 = Object.getOwnPropertyDescriptor(t8, n10) : r7, o11;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e13, t8, n10, r7);
  else for (var s7 = e13.length - 1; s7 >= 0; s7--) (o11 = e13[s7]) && (a5 = (i9 < 3 ? o11(a5) : i9 > 3 ? o11(t8, n10, a5) : o11(t8, n10)) || a5);
  return i9 > 3 && a5 && Object.defineProperty(t8, n10, a5), a5;
}

// deps/swc/swc-dist/core/element/define-element.js
function e8(e13, t8) {
  window.__swc && window.__swc.DEBUG && customElements.get(e13) && window.__swc.warn(void 0, `Attempted to redefine <${e13}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e13, t8);
}

// deps/swc/swc-dist/core/element/version.js
var e9 = "0.1.0";
var t5 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e10(e13 = document) {
  var t8;
  let n10 = e13.activeElement;
  for (; !(n10 == null || (t8 = n10.shadowRoot) == null) && t8.activeElement; ) n10 = n10.shadowRoot.activeElement;
  return n10;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i5;
function a3(t8) {
  class n10 extends t8 {
    hasVisibleFocusInTree() {
      var t9;
      let n11 = e10(this.getRootNode());
      return (t9 = n11 == null ? void 0 : n11.matches(":focus-visible")) == null ? false : t9;
    }
  }
  return n10;
}
var o8 = class extends a3(i4) {
  get dir() {
    var e13;
    return (e13 = getComputedStyle(this).direction) == null ? "ltr" : e13;
  }
};
if (i5 = o8, i5.VERSION = e9, i5.CORE_VERSION = t5, true) {
  let e13 = {
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
    ignoreWarningLocalNames: { ...((s7 = window.__swc) == null ? void 0 : s7.ignoreWarningLocalNames) || {} },
    ignoreWarningTypes: {
      ...e13,
      ...((c6 = window.__swc) == null ? void 0 : c6.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t8,
      ...((l5 = window.__swc) == null ? void 0 : l5.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e14, t9, n10, { type: r7 = "api", level: i9 = "default", issues: a5 } = {}) => {
      let { localName: o11 = "base" } = e14 || {}, s8 = `${o11}:${r7}:${i9}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s8) || window.__swc.ignoreWarningLocalNames[o11] || window.__swc.ignoreWarningTypes[r7] || window.__swc.ignoreWarningLevels[i9]) return;
      window.__swc.issuedWarnings.add(s8);
      let c7 = "";
      a5 && a5.length && (a5.unshift(""), c7 = a5.join("\n    - ") + "\n");
      let l6 = i9 === "deprecation" ? "DEPRECATION NOTICE: " : "", u5 = e14 ? "\nInspect this issue in the follow element:" : "", d4 = (e14 ? "\n\n" : "\n") + n10 + "\n", f3 = [];
      f3.push(l6 + t9 + "\n" + c7 + u5), e14 && f3.push(e14), f3.push(d4, { data: {
        localName: o11,
        type: r7,
        level: i9
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s7;
var c6;
var l5;

// node_modules/@lit-labs/observers/mutation-controller.js
var s4 = class {
  constructor(s7, { target: i9, config: h3, callback: o11, skipInitial: e13 }) {
    this.t = /* @__PURE__ */ new Set(), this.o = false, this.i = false, this.h = s7, null !== i9 && this.t.add(i9 ?? s7), this.l = h3, this.o = e13 ?? this.o, this.callback = o11, o5 || (window.MutationObserver ? (this.u = new MutationObserver((t8) => {
      this.handleChanges(t8), this.h.requestUpdate();
    }), s7.addController(this)) : console.warn("MutationController error: browser does not support MutationObserver."));
  }
  handleChanges(t8) {
    this.value = this.callback?.(t8, this.u);
  }
  hostConnected() {
    for (const t8 of this.t) this.observe(t8);
  }
  hostDisconnected() {
    this.disconnect();
  }
  async hostUpdated() {
    const t8 = this.u.takeRecords();
    (t8.length || !this.o && this.i) && this.handleChanges(t8), this.i = false;
  }
  observe(t8) {
    this.t.add(t8), this.u.observe(t8, this.l), this.i = true, this.h.requestUpdate();
  }
  disconnect() {
    this.u.disconnect();
  }
};

// deps/swc/swc-dist/core/mixins/observe-slot-presence.js
var t6 = /* @__PURE__ */ Symbol("slotContentIsPresent");
function n5(n10, r7) {
  let i9 = Array.isArray(r7) ? r7 : [r7];
  class a5 extends n10 {
    constructor(...n11) {
      super(...n11), this[t6] = /* @__PURE__ */ new Map(), this.managePresenceObservedSlot = () => {
        let e13 = false;
        i9.forEach((n12) => {
          let r8 = !!this.querySelector(`:scope > ${n12}`), i10 = this[t6].get(n12) || false;
          e13 = e13 || i10 !== r8, this[t6].set(n12, !!this.querySelector(`:scope > ${n12}`));
        }), e13 && this.updateComplete.then(() => {
          this.requestUpdate();
        });
      }, new s4(this, {
        config: {
          childList: true,
          subtree: true
        },
        callback: () => {
          this.managePresenceObservedSlot();
        }
      }), this.managePresenceObservedSlot();
    }
    get slotContentIsPresent() {
      if (i9.length === 1) return this[t6].get(i9[0]) || false;
      throw Error("Multiple selectors provided to `ObserveSlotPresence` use `getSlotContentPresence(selector: string)` instead.");
    }
    getSlotContentPresence(e13) {
      if (this[t6].has(e13)) return this[t6].get(e13) || false;
      throw Error(`The provided selector \`${e13}\` is not being observed.`);
    }
  }
  return a5;
}

// deps/swc/swc-dist/core/controllers/language-resolution.js
var e11 = /* @__PURE__ */ Symbol("language resolver updated");
var t7 = /* @__PURE__ */ new Set();
var n6;
function r5(e13) {
  return t7.add(e13), n6 || (n6 = new MutationObserver(() => {
    for (let e14 of t7) e14();
  }), n6.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"]
  })), () => {
    t7.delete(e13), t7.size === 0 && (n6 == null || n6.disconnect(), n6 = void 0);
  };
}
var i6 = class {
  constructor(e13) {
    this.language = this.getDocumentLanguage(), this.host = e13, this.host.addController(this);
  }
  getDocumentLanguage() {
    let e13 = document.documentElement.lang || navigator.language || "en-US";
    try {
      return Intl.DateTimeFormat.supportedLocalesOf([e13]), e13;
    } catch (e14) {
      return "en-US";
    }
  }
  hostConnected() {
    this.resolveLanguage(), this.removeLangListener = r5(this.handleLangChange.bind(this));
  }
  hostDisconnected() {
    var e13, t8;
    (e13 = this.unsubscribe) == null || e13.call(this), this.unsubscribe = void 0, (t8 = this.removeLangListener) == null || t8.call(this), this.removeLangListener = void 0;
  }
  handleLangChange() {
    if (this.unsubscribe) return;
    let t8 = this.getDocumentLanguage();
    if (t8 === this.language) return;
    let n10 = this.language;
    this.language = t8, this.host.requestUpdate(e11, n10);
  }
  resolveLanguage() {
    this.language = this.getDocumentLanguage();
    let t8 = new CustomEvent("sp-language-context", {
      bubbles: true,
      composed: true,
      detail: { callback: (t9, n10) => {
        let r7 = this.language;
        this.language = t9, this.unsubscribe = n10, this.host.requestUpdate(e11, r7);
      } },
      cancelable: true
    });
    this.host.dispatchEvent(t8);
  }
};

// deps/swc/swc-dist/core/mixins/linear-progress-mixin.js
var i7 = [
  "s",
  "m",
  "l",
  "xl"
];
var s5 = { style: "percent" };
var c4 = '[slot="label"]';
var l3 = '[slot="description"]';
var u3 = 0;
function d3(i9) {
  class a5 extends n5(i9, [c4, l3]) {
    constructor(...e13) {
      super(...e13), this.value = 0, this.minValue = 0, this.maxValue = 100, this.accessibleLabel = "", this.labelPosition = "top", this.languageResolver = new i6(this), this._instanceId = ++u3, this._hasWarnedNoAccessibleName = false, this._hasWarnedValueOutOfRange = false;
    }
    get labelContainerId() {
      return `swc-linear-progress-label-${this._instanceId}`;
    }
    get descriptionContainerId() {
      return `swc-linear-progress-description-${this._instanceId}`;
    }
    get hasLabelSlotContent() {
      return this.getSlotContentPresence(c4);
    }
    get hasDescriptionSlotContent() {
      return this.getSlotContentPresence(l3);
    }
    get sanitizedMin() {
      let e13 = Number.isFinite(this.minValue) ? this.minValue : 0, t8 = Number.isFinite(this.maxValue) ? this.maxValue : 100;
      return Math.min(e13, t8);
    }
    get sanitizedMax() {
      let e13 = Number.isFinite(this.minValue) ? this.minValue : 0, t8 = Number.isFinite(this.maxValue) ? this.maxValue : 100;
      return Math.max(e13, t8);
    }
    get clampedValue() {
      let e13 = Number.isFinite(this.value) ? this.value : 0;
      return Math.min(this.sanitizedMax, Math.max(this.sanitizedMin, e13));
    }
    get fillPercent() {
      let e13 = this.sanitizedMin, t8 = this.sanitizedMax;
      if (t8 === e13) return 0;
      let n10 = (this.clampedValue - e13) / (t8 - e13);
      return Math.min(100, Math.max(0, n10 * 100));
    }
    get formattedValue() {
      if (this.valueLabel) return this.valueLabel;
      let e13 = this.sanitizedMin, t8 = this.sanitizedMax, n10 = this.formatOptions && typeof this.formatOptions == "object" && Object.keys(this.formatOptions).length > 0 ? this.formatOptions : s5, r7 = new Intl.NumberFormat(this.languageResolver.language, n10);
      if (n10.style === "percent") {
        let n11 = t8 === e13 ? 0 : (this.clampedValue - e13) / (t8 - e13);
        return r7.format(n11);
      }
      return r7.format(this.clampedValue);
    }
    updated(e13) {
      var t8, n10;
      super.updated(e13), (t8 = window.__swc) != null && t8.DEBUG && (e13.has("accessibleLabel") || !this._hasWarnedNoAccessibleName) && this.warnMissingAccessibleName(), (n10 = window.__swc) != null && n10.DEBUG && (e13.has("value") || e13.has("minValue") || e13.has("maxValue")) && this.warnValueOutOfRange();
    }
    warnValueOutOfRange() {
      var e13;
      let t8 = this.value, n10 = this.sanitizedMin, r7 = this.sanitizedMax;
      if (!Number.isFinite(t8) || t8 >= n10 && t8 <= r7) {
        this._hasWarnedValueOutOfRange = false;
        return;
      }
      this._hasWarnedValueOutOfRange || (this._hasWarnedValueOutOfRange = true, (e13 = window.__swc) == null || e13.warn(this, `<${this.localName}> "value" (${t8}) is outside the [${n10}, ${r7}] range and was clamped to ${this.clampedValue}.`, "https://spectrum-web-components.adobe.com/?path=/docs/components-meter--docs", { issues: ['set "value" within the "min-value" and "max-value" range, or', 'adjust "min-value"/"max-value" so the range includes the value.'] }));
    }
    warnMissingAccessibleName() {
      var e13;
      if (this.hasLabelSlotContent || this.accessibleLabel) {
        this._hasWarnedNoAccessibleName = false;
        return;
      }
      this._hasWarnedNoAccessibleName = true, (e13 = window.__swc) == null || e13.warn(this, `<${this.localName}> requires an accessible name.`, "https://spectrum-web-components.adobe.com/?path=/docs/components-meter--docs", {
        type: "accessibility",
        issues: ['add visible label content via the "label" named slot, or', 'set the "accessible-label" attribute (or "accessibleLabel" property) when there is no visible label, for example a data grid of meters.']
      });
    }
  }
  return e7([n4({
    type: Number,
    reflect: true
  })], a5.prototype, "value", void 0), e7([n4({
    type: Number,
    reflect: true,
    attribute: "min-value"
  })], a5.prototype, "minValue", void 0), e7([n4({
    type: Number,
    reflect: true,
    attribute: "max-value"
  })], a5.prototype, "maxValue", void 0), e7([n4({
    type: String,
    attribute: "accessible-label"
  })], a5.prototype, "accessibleLabel", void 0), e7([n4({
    type: String,
    attribute: "value-label"
  })], a5.prototype, "valueLabel", void 0), e7([n4({ attribute: false })], a5.prototype, "formatOptions", void 0), e7([n4({
    type: String,
    reflect: true,
    attribute: "label-position"
  })], a5.prototype, "labelPosition", void 0), e7([n4({
    type: String,
    reflect: true,
    attribute: "static-color"
  })], a5.prototype, "staticColor", void 0), a5;
}

// deps/swc/swc-dist/core/mixins/sized-mixin.js
var r6 = [
  "s",
  "m",
  "l",
  "xl"
];
function i8(n10, { validSizes: i9 = [...r6], noDefaultSize: a5, defaultSize: o11 = "m" } = {}) {
  var s7;
  class c6 extends n10 {
    constructor(...e13) {
      super(...e13), this._size = o11;
    }
    get size() {
      return this._size || o11;
    }
    set size(e13) {
      let t8 = a5 ? null : o11, n11 = e13 && e13.toLocaleLowerCase(), r7 = this.constructor.VALID_SIZES.includes(n11) ? n11 : t8;
      if (r7 && this.setAttribute("size", r7), this._size === r7) return;
      let i10 = this._size;
      this._size = r7, this.requestUpdate("size", i10);
    }
    update(e13) {
      !this.hasAttribute("size") && !a5 && this.setAttribute("size", this.size), super.update(e13);
    }
  }
  return s7 = c6, s7.VALID_SIZES = i9, e7([n4({ type: String })], c6.prototype, "size", null), c6;
}

// deps/swc/swc-dist/core/components/meter/Meter.base.js
var s6;
var c5 = class extends d3(i8(o8, {
  validSizes: i7,
  defaultSize: "m"
})) {
  constructor(...e13) {
    super(...e13), this.variant = "informative";
  }
  willUpdate(e13) {
    let t8 = this.constructor;
    if (!t8.VARIANTS.includes(this.variant)) {
      var n10;
      (n10 = window.__swc) != null && n10.DEBUG && window.__swc.warn(this, `<${this.localName}> element expects the "variant" attribute to be one of the following:`, "https://spectrum-web-components.adobe.com/?path=/docs/components-meter--docs", { issues: [...t8.VARIANTS] }), this.variant = "informative";
    }
    super.willUpdate(e13);
  }
};
s6 = c5, s6.VARIANTS = e6, e7([n4({
  type: String,
  reflect: true
})], c5.prototype, "variant", void 0);

// deps/swc/swc-dist/components/meter/Meter2.js
var l4;
var u4 = class extends c5 {
  constructor(...e13) {
    super(...e13), this.variant = "informative";
  }
  static get styles() {
    return [t3, t4];
  }
  render() {
    let e13 = this.hasLabelSlotContent, t8 = this.hasDescriptionSlotContent, n10 = this.sanitizedMin, o11 = this.sanitizedMax, s7 = this.clampedValue, c6 = this.fillPercent, l5 = this.formattedValue, u5 = e13 ? this.labelContainerId : void 0, d4 = !e13 && this.accessibleLabel ? this.accessibleLabel : void 0, f3 = t8 ? this.descriptionContainerId : void 0;
    return b2`
      <div
        class="swc-LinearProgress"
        role="meter"
        aria-valuemin=${n10}
        aria-valuemax=${o11}
        aria-valuenow=${s7}
        aria-valuetext=${l5}
        aria-labelledby=${o6(u5)}
        aria-label=${o6(d4)}
        aria-describedby=${o6(f3)}
      >
        ${e13 ? b2`
              <span
                id=${this.labelContainerId}
                class="swc-LinearProgress-label"
              >
                <slot name="label"></slot>
              </span>
            ` : A}
        <span class="swc-LinearProgress-value">${l5}</span>
        <div class="swc-LinearProgress-track">
          <div
            class="swc-LinearProgress-fill"
            style="inline-size: ${c6}%;"
          ></div>
        </div>
        ${t8 ? b2`
              <span
                id=${this.descriptionContainerId}
                class="swc-LinearProgress-description"
              >
                <slot name="description"></slot>
              </span>
            ` : A}
      </div>
    `;
  }
};
l4 = u4, l4.VARIANTS = e6, e([n4({
  type: String,
  reflect: true
})], u4.prototype, "variant", void 0);

// deps/swc/swc-dist/components/meter/swc-meter.js
e8("swc-meter", u4);
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

lit-html/directives/if-defined.js:
  (**
   * @license
   * Copyright 2018 Google LLC
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
