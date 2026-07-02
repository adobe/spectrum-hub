// deps/swc/swc-dist/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e(e14, t8, n11, r7) {
  var i11 = arguments.length, a6 = i11 < 3 ? t8 : r7 === null ? r7 = Object.getOwnPropertyDescriptor(t8, n11) : r7, o10;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a6 = Reflect.decorate(e14, t8, n11, r7);
  else for (var s5 = e14.length - 1; s5 >= 0; s5--) (o10 = e14[s5]) && (a6 = (i11 < 3 ? o10(a6) : i11 > 3 ? o10(t8, n11, a6) : o10(t8, n11)) || a6);
  return i11 > 3 && a6 && Object.defineProperty(t8, n11, a6), a6;
}

// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e2 = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t8, e14, o10) {
    if (this._$cssResult$ = true, o10 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t8, this.t = e14;
  }
  get styleSheet() {
    let t8 = this.o;
    const s5 = this.t;
    if (e2 && void 0 === t8) {
      const e14 = void 0 !== s5 && 1 === s5.length;
      e14 && (t8 = o.get(s5)), void 0 === t8 && ((this.o = t8 = new CSSStyleSheet()).replaceSync(this.cssText), e14 && o.set(s5, t8));
    }
    return t8;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t8) => new n("string" == typeof t8 ? t8 : t8 + "", void 0, s);
var i = (t8, ...e14) => {
  const o10 = 1 === t8.length ? t8[0] : e14.reduce((e15, s5, o11) => e15 + ((t9) => {
    if (true === t9._$cssResult$) return t9.cssText;
    if ("number" == typeof t9) return t9;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t9 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t8[o11 + 1], t8[0]);
  return new n(o10, t8, s);
};
var S = (s5, o10) => {
  if (e2) s5.adoptedStyleSheets = o10.map((t8) => t8 instanceof CSSStyleSheet ? t8 : t8.styleSheet);
  else for (const e14 of o10) {
    const o11 = document.createElement("style"), n11 = t.litNonce;
    void 0 !== n11 && o11.setAttribute("nonce", n11), o11.textContent = e14.cssText, s5.appendChild(o11);
  }
};
var c = e2 ? (t8) => t8 : (t8) => t8 instanceof CSSStyleSheet ? ((t9) => {
  let e14 = "";
  for (const s5 of t9.cssRules) e14 += s5.cssText;
  return r(e14);
})(t8) : t8;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e3, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t8, s5) => t8;
var u = { toAttribute(t8, s5) {
  switch (s5) {
    case Boolean:
      t8 = t8 ? l : null;
      break;
    case Object:
    case Array:
      t8 = null == t8 ? t8 : JSON.stringify(t8);
  }
  return t8;
}, fromAttribute(t8, s5) {
  let i11 = t8;
  switch (s5) {
    case Boolean:
      i11 = null !== t8;
      break;
    case Number:
      i11 = null === t8 ? null : Number(t8);
      break;
    case Object:
    case Array:
      try {
        i11 = JSON.parse(t8);
      } catch (t9) {
        i11 = null;
      }
  }
  return i11;
} };
var f = (t8, s5) => !i2(t8, s5);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t8) {
    this._$Ei(), (this.l ??= []).push(t8);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t8, s5 = b) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t8) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t8, s5), !s5.noAccessor) {
      const i11 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t8, i11, s5);
      void 0 !== h3 && e3(this.prototype, t8, h3);
    }
  }
  static getPropertyDescriptor(t8, s5, i11) {
    const { get: e14, set: r7 } = h(this.prototype, t8) ?? { get() {
      return this[s5];
    }, set(t9) {
      this[s5] = t9;
    } };
    return { get: e14, set(s6) {
      const h3 = e14?.call(this);
      r7?.call(this, s6), this.requestUpdate(t8, h3, i11);
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
      const t9 = this.properties, s5 = [...r2(t9), ...o2(t9)];
      for (const i11 of s5) this.createProperty(i11, t9[i11]);
    }
    const t8 = this[Symbol.metadata];
    if (null !== t8) {
      const s5 = litPropertyMetadata.get(t8);
      if (void 0 !== s5) for (const [t9, i11] of s5) this.elementProperties.set(t9, i11);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t9, s5] of this.elementProperties) {
      const i11 = this._$Eu(t9, s5);
      void 0 !== i11 && this._$Eh.set(i11, t9);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s5) {
    const i11 = [];
    if (Array.isArray(s5)) {
      const e14 = new Set(s5.flat(1 / 0).reverse());
      for (const s6 of e14) i11.unshift(c(s6));
    } else void 0 !== s5 && i11.push(c(s5));
    return i11;
  }
  static _$Eu(t8, s5) {
    const i11 = s5.attribute;
    return false === i11 ? void 0 : "string" == typeof i11 ? i11 : "string" == typeof t8 ? t8.toLowerCase() : void 0;
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
    const t8 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i11 of s5.keys()) this.hasOwnProperty(i11) && (t8.set(i11, this[i11]), delete this[i11]);
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
  attributeChangedCallback(t8, s5, i11) {
    this._$AK(t8, i11);
  }
  _$ET(t8, s5) {
    const i11 = this.constructor.elementProperties.get(t8), e14 = this.constructor._$Eu(t8, i11);
    if (void 0 !== e14 && true === i11.reflect) {
      const h3 = (void 0 !== i11.converter?.toAttribute ? i11.converter : u).toAttribute(s5, i11.type);
      this._$Em = t8, null == h3 ? this.removeAttribute(e14) : this.setAttribute(e14, h3), this._$Em = null;
    }
  }
  _$AK(t8, s5) {
    const i11 = this.constructor, e14 = i11._$Eh.get(t8);
    if (void 0 !== e14 && this._$Em !== e14) {
      const t9 = i11.getPropertyOptions(e14), h3 = "function" == typeof t9.converter ? { fromAttribute: t9.converter } : void 0 !== t9.converter?.fromAttribute ? t9.converter : u;
      this._$Em = e14;
      const r7 = h3.fromAttribute(s5, t9.type);
      this[e14] = r7 ?? this._$Ej?.get(e14) ?? r7, this._$Em = null;
    }
  }
  requestUpdate(t8, s5, i11, e14 = false, h3) {
    if (void 0 !== t8) {
      const r7 = this.constructor;
      if (false === e14 && (h3 = this[t8]), i11 ??= r7.getPropertyOptions(t8), !((i11.hasChanged ?? f)(h3, s5) || i11.useDefault && i11.reflect && h3 === this._$Ej?.get(t8) && !this.hasAttribute(r7._$Eu(t8, i11)))) return;
      this.C(t8, s5, i11);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t8, s5, { useDefault: i11, reflect: e14, wrapped: h3 }, r7) {
    i11 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t8) && (this._$Ej.set(t8, r7 ?? s5 ?? this[t8]), true !== h3 || void 0 !== r7) || (this._$AL.has(t8) || (this.hasUpdated || i11 || (s5 = void 0), this._$AL.set(t8, s5)), true === e14 && this._$Em !== t8 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t8));
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
        for (const [t10, s6] of this._$Ep) this[t10] = s6;
        this._$Ep = void 0;
      }
      const t9 = this.constructor.elementProperties;
      if (t9.size > 0) for (const [s6, i11] of t9) {
        const { wrapped: t10 } = i11, e14 = this[s6];
        true !== t10 || this._$AL.has(s6) || void 0 === e14 || this.C(s6, void 0, i11, e14);
      }
    }
    let t8 = false;
    const s5 = this._$AL;
    try {
      t8 = this.shouldUpdate(s5), t8 ? (this.willUpdate(s5), this._$EO?.forEach((t9) => t9.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t8 = false, this._$EM(), s6;
    }
    t8 && this._$AE(s5);
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
var x = (t8) => (i11, ...s5) => ({ _$litType$: t8, strings: i11, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t8, i11) {
  if (!u2(t8) || !t8.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e4 ? e4.createHTML(i11) : i11;
}
var N = (t8, i11) => {
  const s5 = t8.length - 1, e14 = [];
  let n11, l4 = 2 === i11 ? "<svg>" : 3 === i11 ? "<math>" : "", c4 = v;
  for (let i12 = 0; i12 < s5; i12++) {
    const s6 = t8[i12];
    let a6, u5, d5 = -1, f3 = 0;
    for (; f3 < s6.length && (c4.lastIndex = f3, u5 = c4.exec(s6), null !== u5); ) f3 = c4.lastIndex, c4 === v ? "!--" === u5[1] ? c4 = _ : void 0 !== u5[1] ? c4 = m : void 0 !== u5[2] ? (y2.test(u5[2]) && (n11 = RegExp("</" + u5[2], "g")), c4 = p2) : void 0 !== u5[3] && (c4 = p2) : c4 === p2 ? ">" === u5[0] ? (c4 = n11 ?? v, d5 = -1) : void 0 === u5[1] ? d5 = -2 : (d5 = c4.lastIndex - u5[2].length, a6 = u5[1], c4 = void 0 === u5[3] ? p2 : '"' === u5[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n11 = void 0);
    const x2 = c4 === p2 && t8[i12 + 1].startsWith("/>") ? " " : "";
    l4 += c4 === v ? s6 + r3 : d5 >= 0 ? (e14.push(a6), s6.slice(0, d5) + h2 + s6.slice(d5) + o3 + x2) : s6 + o3 + (-2 === d5 ? i12 : x2);
  }
  return [V(t8, l4 + (t8[s5] || "<?>") + (2 === i11 ? "</svg>" : 3 === i11 ? "</math>" : "")), e14];
};
var S2 = class _S {
  constructor({ strings: t8, _$litType$: i11 }, e14) {
    let r7;
    this.parts = [];
    let l4 = 0, a6 = 0;
    const u5 = t8.length - 1, d5 = this.parts, [f3, v2] = N(t8, i11);
    if (this.el = _S.createElement(f3, e14), P.currentNode = this.el.content, 2 === i11 || 3 === i11) {
      const t9 = this.el.content.firstChild;
      t9.replaceWith(...t9.childNodes);
    }
    for (; null !== (r7 = P.nextNode()) && d5.length < u5; ) {
      if (1 === r7.nodeType) {
        if (r7.hasAttributes()) for (const t9 of r7.getAttributeNames()) if (t9.endsWith(h2)) {
          const i12 = v2[a6++], s5 = r7.getAttribute(t9).split(o3), e15 = /([.?@])?(.*)/.exec(i12);
          d5.push({ type: 1, index: l4, name: e15[2], strings: s5, ctor: "." === e15[1] ? I : "?" === e15[1] ? L : "@" === e15[1] ? z : H }), r7.removeAttribute(t9);
        } else t9.startsWith(o3) && (d5.push({ type: 6, index: l4 }), r7.removeAttribute(t9));
        if (y2.test(r7.tagName)) {
          const t9 = r7.textContent.split(o3), i12 = t9.length - 1;
          if (i12 > 0) {
            r7.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i12; s5++) r7.append(t9[s5], c3()), P.nextNode(), d5.push({ type: 2, index: ++l4 });
            r7.append(t9[i12], c3());
          }
        }
      } else if (8 === r7.nodeType) if (r7.data === n3) d5.push({ type: 2, index: l4 });
      else {
        let t9 = -1;
        for (; -1 !== (t9 = r7.data.indexOf(o3, t9 + 1)); ) d5.push({ type: 7, index: l4 }), t9 += o3.length - 1;
      }
      l4++;
    }
  }
  static createElement(t8, i11) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t8, s5;
  }
};
function M(t8, i11, s5 = t8, e14) {
  if (i11 === E) return i11;
  let h3 = void 0 !== e14 ? s5._$Co?.[e14] : s5._$Cl;
  const o10 = a2(i11) ? void 0 : i11._$litDirective$;
  return h3?.constructor !== o10 && (h3?._$AO?.(false), void 0 === o10 ? h3 = void 0 : (h3 = new o10(t8), h3._$AT(t8, s5, e14)), void 0 !== e14 ? (s5._$Co ??= [])[e14] = h3 : s5._$Cl = h3), void 0 !== h3 && (i11 = M(t8, h3._$AS(t8, i11.values), h3, e14)), i11;
}
var R = class {
  constructor(t8, i11) {
    this._$AV = [], this._$AN = void 0, this._$AD = t8, this._$AM = i11;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t8) {
    const { el: { content: i11 }, parts: s5 } = this._$AD, e14 = (t8?.creationScope ?? l2).importNode(i11, true);
    P.currentNode = e14;
    let h3 = P.nextNode(), o10 = 0, n11 = 0, r7 = s5[0];
    for (; void 0 !== r7; ) {
      if (o10 === r7.index) {
        let i12;
        2 === r7.type ? i12 = new k(h3, h3.nextSibling, this, t8) : 1 === r7.type ? i12 = new r7.ctor(h3, r7.name, r7.strings, this, t8) : 6 === r7.type && (i12 = new Z(h3, this, t8)), this._$AV.push(i12), r7 = s5[++n11];
      }
      o10 !== r7?.index && (h3 = P.nextNode(), o10++);
    }
    return P.currentNode = l2, e14;
  }
  p(t8) {
    let i11 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t8, s5, i11), i11 += s5.strings.length - 2) : s5._$AI(t8[i11])), i11++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t8, i11, s5, e14) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t8, this._$AB = i11, this._$AM = s5, this.options = e14, this._$Cv = e14?.isConnected ?? true;
  }
  get parentNode() {
    let t8 = this._$AA.parentNode;
    const i11 = this._$AM;
    return void 0 !== i11 && 11 === t8?.nodeType && (t8 = i11.parentNode), t8;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t8, i11 = this) {
    t8 = M(this, t8, i11), a2(t8) ? t8 === A || null == t8 || "" === t8 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t8 !== this._$AH && t8 !== E && this._(t8) : void 0 !== t8._$litType$ ? this.$(t8) : void 0 !== t8.nodeType ? this.T(t8) : d2(t8) ? this.k(t8) : this._(t8);
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
    const { values: i11, _$litType$: s5 } = t8, e14 = "number" == typeof s5 ? this._$AC(t8) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e14) this._$AH.p(i11);
    else {
      const t9 = new R(e14, this), s6 = t9.u(this.options);
      t9.p(i11), this.T(s6), this._$AH = t9;
    }
  }
  _$AC(t8) {
    let i11 = C.get(t8.strings);
    return void 0 === i11 && C.set(t8.strings, i11 = new S2(t8)), i11;
  }
  k(t8) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i11 = this._$AH;
    let s5, e14 = 0;
    for (const h3 of t8) e14 === i11.length ? i11.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i11[e14], s5._$AI(h3), e14++;
    e14 < i11.length && (this._$AR(s5 && s5._$AB.nextSibling, e14), i11.length = e14);
  }
  _$AR(t8 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t8 !== this._$AB; ) {
      const s6 = i3(t8).nextSibling;
      i3(t8).remove(), t8 = s6;
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
  constructor(t8, i11, s5, e14, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t8, this.name = i11, this._$AM = e14, this.options = h3, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t8, i11 = this, s5, e14) {
    const h3 = this.strings;
    let o10 = false;
    if (void 0 === h3) t8 = M(this, t8, i11, 0), o10 = !a2(t8) || t8 !== this._$AH && t8 !== E, o10 && (this._$AH = t8);
    else {
      const e15 = t8;
      let n11, r7;
      for (t8 = h3[0], n11 = 0; n11 < h3.length - 1; n11++) r7 = M(this, e15[s5 + n11], i11, n11), r7 === E && (r7 = this._$AH[n11]), o10 ||= !a2(r7) || r7 !== this._$AH[n11], r7 === A ? t8 = A : t8 !== A && (t8 += (r7 ?? "") + h3[n11 + 1]), this._$AH[n11] = r7;
    }
    o10 && !e14 && this.j(t8);
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
  constructor(t8, i11, s5, e14, h3) {
    super(t8, i11, s5, e14, h3), this.type = 5;
  }
  _$AI(t8, i11 = this) {
    if ((t8 = M(this, t8, i11, 0) ?? A) === E) return;
    const s5 = this._$AH, e14 = t8 === A && s5 !== A || t8.capture !== s5.capture || t8.once !== s5.once || t8.passive !== s5.passive, h3 = t8 !== A && (s5 === A || e14);
    e14 && this.element.removeEventListener(this.name, this, s5), h3 && this.element.addEventListener(this.name, this, t8), this._$AH = t8;
  }
  handleEvent(t8) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t8) : this._$AH.handleEvent(t8);
  }
};
var Z = class {
  constructor(t8, i11, s5) {
    this.element = t8, this.type = 6, this._$AN = void 0, this._$AM = i11, this.options = s5;
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
var D = (t8, i11, s5) => {
  const e14 = s5?.renderBefore ?? i11;
  let h3 = e14._$litPart$;
  if (void 0 === h3) {
    const t9 = s5?.renderBefore ?? null;
    e14._$litPart$ = h3 = new k(i11.insertBefore(c3(), t9), t9, void 0, s5 ?? {});
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

// deps/swc/swc-dist/components/badge/badge.js
var t3 = i`:host{display:inline-flex;align-self:start;justify-self:start;place-self:start;vertical-align:middle}*{box-sizing:border-box}.swc-Badge{--_swc-badge-border-width: 2px;--_swc-badge-padding-block: var(--swc-badge-padding-block, 5px);--_swc-badge-padding-inline-start: var(--swc-badge-padding-inline-start, var(--swc-badge-padding-inline, var(--swc-base-padding-horizontal-small)));--_swc-badge-padding-inline: var(--swc-badge-padding-inline, var(--swc-base-padding-horizontal-small));--_swc-badge-line-height: var(--swc-badge-line-height, var(--swc-line-height-font-size-75));display:inline-flex;gap:var(--swc-badge-gap, 4px);align-items:center;min-block-size:var(--swc-badge-height, var(--swc-component-height-75));padding-block:calc(var(--_swc-badge-padding-block) - var(--_swc-badge-border-width));padding-inline-start:calc(var(--_swc-badge-padding-inline-start) - var(--_swc-badge-border-width));padding-inline-end:calc(var(--_swc-badge-padding-inline) - var(--_swc-badge-border-width));color:var(--swc-badge-label-icon-color, rgb(255, 255, 255));background:var(--swc-badge-background-color, var(--swc-neutral-subdued-background-color-default));border:var(--_swc-badge-border-width) solid var(--swc-badge-border-color, transparent);border-radius:var(--swc-badge-corner-radius, 7px);cursor:default}.swc-Badge:where(:has(.swc-Badge-icon):not(.swc-Badge--no-label)){--swc-badge-padding-inline-start: var(--swc-badge-with-icon-padding-inline, var(--swc-base-padding-horizontal-small))}.swc-Badge--no-label:where(:has(.swc-Badge-icon)){--swc-badge-padding-block: var(--swc-badge-with-icon-only-padding-block, 5px);--swc-badge-padding-inline-start: var(--swc-badge-with-icon-only-padding-inline, 5px);--swc-badge-padding-inline: var(--swc-badge-with-icon-only-padding-inline, 5px);--swc-badge-gap: 0}.swc-Badge-label{font-size:var(--swc-badge-font-size, var(--swc-font-size-75));font-weight:500;line-height:var(--_swc-badge-line-height);&:lang(ja),&:lang(zh),&:lang(ko){--swc-badge-line-height: 1.5}}.swc-Badge-icon{--_swc-badge-icon-size: var(--swc-workflow-icon-small);display:grid;flex-shrink:0;align-content:center;justify-content:center;place-content:center;inline-size:var(--swc-badge-icon-size, var(--_swc-badge-icon-size));block-size:var(--swc-badge-icon-size, var(--_swc-badge-icon-size))}:host([size=\"m\"]){--swc-badge-height: var(--swc-component-height-100);--swc-badge-corner-radius: 8px;--swc-badge-gap: 6px;--swc-badge-padding-inline: var(--swc-base-padding-horizontal-medium);--swc-badge-with-icon-padding-inline: var(--swc-base-padding-horizontal-medium);--swc-badge-with-icon-only-padding-inline: 7px;--swc-badge-with-icon-only-padding-block: 7px;--swc-badge-padding-block: 7px;--swc-badge-font-size: var(--swc-font-size-100);--swc-badge-icon-size: var(--swc-workflow-icon-medium);--swc-badge-line-height: var(--swc-line-height-font-size-100)}:host([size=\"l\"]){--swc-badge-height: var(--swc-component-height-200);--swc-badge-corner-radius: 9px;--swc-badge-gap: 6px;--swc-badge-padding-inline: var(--swc-base-padding-horizontal-large);--swc-badge-with-icon-padding-inline: var(--swc-base-padding-horizontal-large);--swc-badge-with-icon-only-padding-inline: 10px;--swc-badge-with-icon-only-padding-block: 10px;--swc-badge-padding-block: 10px;--swc-badge-font-size: var(--swc-font-size-200);--swc-badge-icon-size: var(--swc-workflow-icon-large);--swc-badge-line-height: var(--swc-line-height-font-size-200)}:host([size=\"xl\"]){--swc-badge-height: var(--swc-component-height-300);--swc-badge-corner-radius: 10px;--swc-badge-gap: 6px;--swc-badge-padding-inline: var(--swc-base-padding-horizontal-extra-large);--swc-badge-with-icon-padding-inline: var(--swc-base-padding-horizontal-extra-large);--swc-badge-with-icon-only-padding-inline: 13px;--swc-badge-with-icon-only-padding-block: 13px;--swc-badge-padding-block: 13px;--swc-badge-font-size: var(--swc-font-size-300);--swc-badge-icon-size: var(--swc-workflow-icon-extra-large);--swc-badge-line-height: var(--swc-line-height-font-size-300)}.swc-Badge--fixed-inline-start{border-start-start-radius:0;border-end-start-radius:0}.swc-Badge--fixed-inline-end{border-start-end-radius:0;border-end-end-radius:0}.swc-Badge--fixed-block-start{border-start-start-radius:0;border-start-end-radius:0}.swc-Badge--fixed-block-end{border-end-start-radius:0;border-end-end-radius:0}:host([variant=\"notice\"]),:host([variant=\"celery\"]),:host([variant=\"chartreuse\"]),:host([variant=\"orange\"]),:host([variant=\"yellow\"]){--swc-badge-label-icon-color: rgb(0, 0, 0)}:host([variant=\"accent\"]){--swc-badge-background-color: var(--swc-accent-background-color-default)}:host([variant=\"informative\"]){--swc-badge-background-color: var(--swc-informative-background-color-default)}:host([variant=\"negative\"]){--swc-badge-background-color: var(--swc-negative-background-color-default)}:host([variant=\"positive\"]){--swc-badge-background-color: var(--swc-positive-background-color-default)}:host([variant=\"notice\"]){--swc-badge-background-color: var(--swc-notice-background-color-default)}.swc-Badge--gray{--swc-badge-background-color: var(--swc-gray-background-color-default)}.swc-Badge--red{--swc-badge-background-color: var(--swc-red-background-color-default)}.swc-Badge--orange{--swc-badge-background-color: var(--swc-orange-background-color-default)}.swc-Badge--yellow{--swc-badge-background-color: var(--swc-yellow-background-color-default)}.swc-Badge--chartreuse{--swc-badge-background-color: var(--swc-chartreuse-background-color-default)}.swc-Badge--celery{--swc-badge-background-color: var(--swc-celery-background-color-default)}.swc-Badge--green{--swc-badge-background-color: var(--swc-green-background-color-default)}.swc-Badge--seafoam{--swc-badge-background-color: var(--swc-seafoam-background-color-default)}.swc-Badge--cyan{--swc-badge-background-color: var(--swc-cyan-background-color-default)}.swc-Badge--blue{--swc-badge-background-color: var(--swc-blue-background-color-default)}.swc-Badge--indigo{--swc-badge-background-color: var(--swc-indigo-background-color-default)}.swc-Badge--purple{--swc-badge-background-color: var(--swc-purple-background-color-default)}.swc-Badge--fuchsia{--swc-badge-background-color: var(--swc-fuchsia-background-color-default)}.swc-Badge--magenta{--swc-badge-background-color: var(--swc-magenta-background-color-default)}.swc-Badge--pink{--swc-badge-background-color: var(--swc-pink-background-color-default)}.swc-Badge--turquoise{--swc-badge-background-color: var(--swc-turquoise-background-color-default)}.swc-Badge--brown{--swc-badge-background-color: var(--swc-brown-background-color-default)}.swc-Badge--cinnamon{--swc-badge-background-color: var(--swc-cinnamon-background-color-default)}.swc-Badge--silver{--swc-badge-background-color: var(--swc-silver-background-color-default)}:host([subtle]){--swc-badge-label-icon-color: var(--swc-gray-1000)}:host([subtle][variant=\"neutral\"]){--swc-badge-background-color: var(--swc-neutral-subtle-background-color-default)}:host([subtle][variant=\"accent\"]){--swc-badge-background-color: var(--swc-accent-subtle-background-color-default)}:host([subtle][variant=\"informative\"]){--swc-badge-background-color: var(--swc-informative-subtle-background-color-default)}:host([subtle][variant=\"negative\"]){--swc-badge-background-color: var(--swc-negative-subtle-background-color-default)}:host([subtle][variant=\"positive\"]){--swc-badge-background-color: var(--swc-positive-subtle-background-color-default)}:host([subtle][variant=\"notice\"]){--swc-badge-background-color: var(--swc-notice-subtle-background-color-default)}.swc-Badge--subtle{&:where(.swc-Badge--gray){--swc-badge-background-color: var(--swc-gray-subtle-background-color-default)}&:where(.swc-Badge--red){--swc-badge-background-color: var(--swc-red-subtle-background-color-default)}&:where(.swc-Badge--orange){--swc-badge-background-color: var(--swc-orange-subtle-background-color-default)}&:where(.swc-Badge--yellow){--swc-badge-background-color: var(--swc-yellow-subtle-background-color-default)}&:where(.swc-Badge--chartreuse){--swc-badge-background-color: var(--swc-chartreuse-subtle-background-color-default)}&:where(.swc-Badge--celery){--swc-badge-background-color: var(--swc-celery-subtle-background-color-default)}&:where(.swc-Badge--green){--swc-badge-background-color: var(--swc-green-subtle-background-color-default)}&:where(.swc-Badge--seafoam){--swc-badge-background-color: var(--swc-seafoam-subtle-background-color-default)}&:where(.swc-Badge--cyan){--swc-badge-background-color: var(--swc-cyan-subtle-background-color-default)}&:where(.swc-Badge--blue){--swc-badge-background-color: var(--swc-blue-subtle-background-color-default)}&:where(.swc-Badge--indigo){--swc-badge-background-color: var(--swc-indigo-subtle-background-color-default)}&:where(.swc-Badge--purple){--swc-badge-background-color: var(--swc-purple-subtle-background-color-default)}&:where(.swc-Badge--fuchsia){--swc-badge-background-color: var(--swc-fuchsia-subtle-background-color-default)}&:where(.swc-Badge--magenta){--swc-badge-background-color: var(--swc-magenta-subtle-background-color-default)}&:where(.swc-Badge--pink){--swc-badge-background-color: var(--swc-pink-subtle-background-color-default)}&:where(.swc-Badge--turquoise){--swc-badge-background-color: var(--swc-turquoise-subtle-background-color-default)}&:where(.swc-Badge--brown){--swc-badge-background-color: var(--swc-brown-subtle-background-color-default)}&:where(.swc-Badge--cinnamon){--swc-badge-background-color: var(--swc-cinnamon-subtle-background-color-default)}&:where(.swc-Badge--silver){--swc-badge-background-color: var(--swc-silver-subtle-background-color-default)}}:host([outline][variant=\"neutral\"]),:host([outline][variant=\"accent\"]),:host([outline][variant=\"informative\"]),:host([outline][variant=\"negative\"]),:host([outline][variant=\"positive\"]),:host([outline][variant=\"notice\"]){--swc-badge-background-color: var(--swc-badge-outline-background-color, var(--swc-background-layer-2-color));--swc-badge-label-icon-color: var(--swc-badge-outline-label-icon-color, var(--swc-gray-1000))}:host([outline][variant=\"neutral\"]){--swc-badge-border-color: var(--swc-neutral-visual-color)}:host([outline][variant=\"accent\"]){--swc-badge-border-color: var(--swc-accent-visual-color)}:host([outline][variant=\"informative\"]){--swc-badge-border-color: var(--swc-informative-visual-color)}:host([outline][variant=\"negative\"]){--swc-badge-border-color: var(--swc-negative-visual-color)}:host([outline][variant=\"positive\"]){--swc-badge-border-color: var(--swc-positive-visual-color)}:host([outline][variant=\"notice\"]){--swc-badge-border-color: var(--swc-notice-visual-color)}`;

// node_modules/@lit/reactive-element/decorators/property.js
var o6 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t8 = o6, e14, r7) => {
  const { kind: n11, metadata: i11 } = r7;
  let s5 = globalThis.litPropertyMetadata.get(i11);
  if (void 0 === s5 && globalThis.litPropertyMetadata.set(i11, s5 = /* @__PURE__ */ new Map()), "setter" === n11 && ((t8 = Object.create(t8)).wrapped = true), s5.set(r7.name, t8), "accessor" === n11) {
    const { name: o10 } = r7;
    return { set(r8) {
      const n12 = e14.get.call(this);
      e14.set.call(this, r8), this.requestUpdate(o10, n12, t8, true, r8);
    }, init(e15) {
      return void 0 !== e15 && this.C(o10, void 0, t8, e15), e15;
    } };
  }
  if ("setter" === n11) {
    const { name: o10 } = r7;
    return function(r8) {
      const n12 = this[o10];
      e14.call(this, r8), this.requestUpdate(o10, n12, t8, true, r8);
    };
  }
  throw Error("Unsupported decorator location: " + n11);
};
function n4(t8) {
  return (e14, o10) => "object" == typeof o10 ? r4(t8, e14, o10) : ((t9, e15, o11) => {
    const r7 = e15.hasOwnProperty(o11);
    return e15.constructor.createProperty(o11, t9), r7 ? Object.getOwnPropertyDescriptor(e15, o11) : void 0;
  })(t8, e14, o10);
}

// node_modules/@lit/reactive-element/decorators/base.js
var e5 = (e14, t8, c4) => (c4.configurable = true, c4.enumerable = true, Reflect.decorate && "object" != typeof t8 && Object.defineProperty(e14, t8, c4), c4);

// node_modules/@lit/reactive-element/decorators/query-assigned-nodes.js
function n5(n11) {
  return (o10, r7) => {
    const { slot: e14 } = n11 ?? {}, s5 = "slot" + (e14 ? `[name=${e14}]` : ":not([name])");
    return e5(o10, r7, { get() {
      const t8 = this.renderRoot?.querySelector(s5);
      return t8?.assignedNodes(n11) ?? [];
    } });
  };
}

// node_modules/lit-html/directive.js
var t4 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e6 = (t8) => (...e14) => ({ _$litDirective$: t8, values: e14 });
var i5 = class {
  constructor(t8) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t8, e14, i11) {
    this._$Ct = t8, this._$AM = e14, this._$Ci = i11;
  }
  _$AS(t8, e14) {
    return this.update(t8, e14);
  }
  update(t8, e14) {
    return this.render(...e14);
  }
};

// node_modules/lit-html/directives/class-map.js
var e7 = e6(class extends i5 {
  constructor(t8) {
    if (super(t8), t8.type !== t4.ATTRIBUTE || "class" !== t8.name || t8.strings?.length > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
  }
  render(t8) {
    return " " + Object.keys(t8).filter((s5) => t8[s5]).join(" ") + " ";
  }
  update(s5, [i11]) {
    if (void 0 === this.st) {
      this.st = /* @__PURE__ */ new Set(), void 0 !== s5.strings && (this.nt = new Set(s5.strings.join(" ").split(/\s/).filter((t8) => "" !== t8)));
      for (const t8 in i11) i11[t8] && !this.nt?.has(t8) && this.st.add(t8);
      return this.render(i11);
    }
    const r7 = s5.element.classList;
    for (const t8 of this.st) t8 in i11 || (r7.remove(t8), this.st.delete(t8));
    for (const t8 in i11) {
      const s6 = !!i11[t8];
      s6 === this.st.has(t8) || this.nt?.has(t8) || (s6 ? (r7.add(t8), this.st.add(t8)) : (r7.remove(t8), this.st.delete(t8)));
    }
    return E;
  }
});

// node_modules/lit-html/directives/when.js
function n6(n11, r7, t8) {
  return n11 ? r7(n11) : t8?.(n11);
}

// deps/swc/swc-dist/core/components/badge/Badge.types.js
var e8 = [
  "s",
  "m",
  "l",
  "xl"
];
var t5 = [
  "accent",
  "informative",
  "neutral",
  "positive",
  "notice",
  "negative"
];
var n7 = [
  "fuchsia",
  "indigo",
  "magenta",
  "purple",
  "seafoam",
  "yellow",
  "gray",
  "red",
  "orange",
  "chartreuse",
  "celery",
  "green",
  "cyan",
  "blue",
  "pink",
  "turquoise",
  "brown",
  "cinnamon",
  "silver"
];
var r5 = [
  "block-start",
  "block-end",
  "inline-start",
  "inline-end"
];
var i6 = [...t5, ...n7];

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e9(e14, t8, n11, r7) {
  var i11 = arguments.length, a6 = i11 < 3 ? t8 : r7 === null ? r7 = Object.getOwnPropertyDescriptor(t8, n11) : r7, o10;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a6 = Reflect.decorate(e14, t8, n11, r7);
  else for (var s5 = e14.length - 1; s5 >= 0; s5--) (o10 = e14[s5]) && (a6 = (i11 < 3 ? o10(a6) : i11 > 3 ? o10(t8, n11, a6) : o10(t8, n11)) || a6);
  return i11 > 3 && a6 && Object.defineProperty(t8, n11, a6), a6;
}

// deps/swc/swc-dist/core/element/define-element.js
function e10(e14, t8) {
  window.__swc && window.__swc.DEBUG && customElements.get(e14) && window.__swc.warn(void 0, `Attempted to redefine <${e14}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e14, t8);
}

// deps/swc/swc-dist/core/element/version.js
var e11 = "0.1.0";
var t6 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e12(e14 = document) {
  var t8;
  let n11 = e14.activeElement;
  for (; !(n11 == null || (t8 = n11.shadowRoot) == null) && t8.activeElement; ) n11 = n11.shadowRoot.activeElement;
  return n11;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i7;
function a3(t8) {
  class n11 extends t8 {
    hasVisibleFocusInTree() {
      var t9;
      let n12 = e12(this.getRootNode());
      return (t9 = n12 == null ? void 0 : n12.matches(":focus-visible")) == null ? false : t9;
    }
  }
  return n11;
}
var o7 = class extends a3(i4) {
  get dir() {
    var e14;
    return (e14 = getComputedStyle(this).direction) == null ? "ltr" : e14;
  }
};
if (i7 = o7, i7.VERSION = e11, i7.CORE_VERSION = t6, true) {
  let e14 = {
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
    ignoreWarningLocalNames: { ...((s5 = window.__swc) == null ? void 0 : s5.ignoreWarningLocalNames) || {} },
    ignoreWarningTypes: {
      ...e14,
      ...((c4 = window.__swc) == null ? void 0 : c4.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t8,
      ...((l4 = window.__swc) == null ? void 0 : l4.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e15, t9, n11, { type: r7 = "api", level: i11 = "default", issues: a6 } = {}) => {
      let { localName: o10 = "base" } = e15 || {}, s6 = `${o10}:${r7}:${i11}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s6) || window.__swc.ignoreWarningLocalNames[o10] || window.__swc.ignoreWarningTypes[r7] || window.__swc.ignoreWarningLevels[i11]) return;
      window.__swc.issuedWarnings.add(s6);
      let c5 = "";
      a6 && a6.length && (a6.unshift(""), c5 = a6.join("\n    - ") + "\n");
      let l5 = i11 === "deprecation" ? "DEPRECATION NOTICE: " : "", u5 = e15 ? "\nInspect this issue in the follow element:" : "", d5 = (e15 ? "\n\n" : "\n") + n11 + "\n", f3 = [];
      f3.push(l5 + t9 + "\n" + c5 + u5), e15 && f3.push(e15), f3.push(d5, { data: {
        localName: o10,
        type: r7,
        level: i11
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s5;
var c4;
var l4;

// node_modules/@lit-labs/observers/mutation-controller.js
var s4 = class {
  constructor(s5, { target: i11, config: h3, callback: o10, skipInitial: e14 }) {
    this.t = /* @__PURE__ */ new Set(), this.o = false, this.i = false, this.h = s5, null !== i11 && this.t.add(i11 ?? s5), this.l = h3, this.o = e14 ?? this.o, this.callback = o10, o5 || (window.MutationObserver ? (this.u = new MutationObserver((t8) => {
      this.handleChanges(t8), this.h.requestUpdate();
    }), s5.addController(this)) : console.warn("MutationController error: browser does not support MutationObserver."));
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
var t7 = /* @__PURE__ */ Symbol("slotContentIsPresent");
function n8(n11, r7) {
  let i11 = Array.isArray(r7) ? r7 : [r7];
  class a6 extends n11 {
    constructor(...n12) {
      super(...n12), this[t7] = /* @__PURE__ */ new Map(), this.managePresenceObservedSlot = () => {
        let e14 = false;
        i11.forEach((n13) => {
          let r8 = !!this.querySelector(`:scope > ${n13}`), i12 = this[t7].get(n13) || false;
          e14 = e14 || i12 !== r8, this[t7].set(n13, !!this.querySelector(`:scope > ${n13}`));
        }), e14 && this.updateComplete.then(() => {
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
      if (i11.length === 1) return this[t7].get(i11[0]) || false;
      throw Error("Multiple selectors provided to `ObserveSlotPresence` use `getSlotContentPresence(selector: string)` instead.");
    }
    getSlotContentPresence(e14) {
      if (this[t7].has(e14)) return this[t7].get(e14) || false;
      throw Error(`The provided selector \`${e14}\` is not being observed.`);
    }
  }
  return a6;
}

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/defineProperty.js
function e13(e14, t8, n11) {
  return t8 in e14 ? Object.defineProperty(e14, t8, { value: n11, enumerable: true, configurable: true, writable: true }) : e14[t8] = n11, e14;
}

// deps/swc/swc-dist/core/mixins/observe-slot-text.js
var a4 = /* @__PURE__ */ Symbol("assignedNodes");
function o8(o10, s5, c4 = []) {
  let l4;
  var u5;
  let d5 = (e14) => (t8) => e14.matches(t8);
  l4 = u5 = a4;
  class f3 extends o10 {
    constructor(...e14) {
      super(...e14), e13(this, l4, void 0), this.slotHasContent = false, new s4(this, {
        config: {
          characterData: true,
          subtree: true
        },
        callback: (e15) => {
          for (let t8 of e15) if (t8.type === "characterData") {
            this.manageTextObservedSlot();
            return;
          }
        }
      });
    }
    manageTextObservedSlot() {
      this[a4] && (this.slotHasContent = [...this[a4]].filter((e14) => {
        let t8 = e14;
        return t8.tagName ? !c4.some(d5(t8)) : t8.textContent ? t8.textContent.trim() : false;
      }).length > 0);
    }
    update(e14) {
      if (!this.hasUpdated) {
        let { childNodes: e15 } = this;
        this.slotHasContent = [...e15].filter((e16) => {
          let t8 = e16;
          return t8.tagName ? c4.some(d5(t8)) ? false : s5 ? t8.getAttribute("slot") === s5 : !t8.hasAttribute("slot") : t8.textContent ? t8.textContent.trim() : false;
        }).length > 0;
      }
      super.update(e14);
    }
    firstUpdated(e14) {
      super.firstUpdated(e14), this.updateComplete.then(() => {
        this.manageTextObservedSlot();
      });
    }
  }
  return e9([n4({
    type: Boolean,
    attribute: false
  })], f3.prototype, "slotHasContent", void 0), e9([n5({
    slot: s5,
    flatten: true
  })], f3.prototype, u5, void 0), f3;
}

// deps/swc/swc-dist/core/mixins/sized-mixin.js
var r6 = [
  "s",
  "m",
  "l",
  "xl"
];
function i9(n11, { validSizes: i11 = [...r6], noDefaultSize: a6, defaultSize: o10 = "m" } = {}) {
  var s5;
  class c4 extends n11 {
    constructor(...e14) {
      super(...e14), this._size = o10;
    }
    get size() {
      return this._size || o10;
    }
    set size(e14) {
      let t8 = a6 ? null : o10, n12 = e14 && e14.toLocaleLowerCase(), r7 = this.constructor.VALID_SIZES.includes(n12) ? n12 : t8;
      if (r7 && this.setAttribute("size", r7), this._size === r7) return;
      let i12 = this._size;
      this._size = r7, this.requestUpdate("size", i12);
    }
    update(e14) {
      !this.hasAttribute("size") && !a6 && this.setAttribute("size", this.size), super.update(e14);
    }
  }
  return s5 = c4, s5.VALID_SIZES = i11, e9([n4({ type: String })], c4.prototype, "size", null), c4;
}

// deps/swc/swc-dist/core/components/badge/Badge.base.js
var l3;
var u3 = class extends i9(o8(n8(o7, '[slot="icon"]'), ""), {
  validSizes: e8,
  defaultSize: "s"
}) {
  constructor(...e14) {
    super(...e14), this.variant = "neutral", this.subtle = false, this.outline = false;
  }
  get hasIcon() {
    return this.slotContentIsPresent;
  }
  update(e14) {
    var t8;
    if ((t8 = window.__swc) != null && t8.DEBUG) {
      let e15 = this.constructor;
      e15.VARIANTS.includes(this.variant) || window.__swc.warn(this, `<${this.localName}> element expects the "variant" attribute to be one of the following:`, "https://opensource.adobe.com/spectrum-web-components/components/badge/#variants", { issues: [...e15.VARIANTS] }), "outline" in this && this.outline === true && !e15.VARIANTS_SEMANTIC.includes(this.variant) && window.__swc.warn(this, `<${this.localName}> element only supports the outline styling if the variant is a semantic color variant.`, "https://opensource.adobe.com/spectrum-web-components/components/badge/#variants", { issues: [...e15.VARIANTS_SEMANTIC] });
    }
    super.update(e14);
  }
};
l3 = u3, l3.FIXED_VALUES = r5, l3.VARIANTS_SEMANTIC = t5, e9([n4({
  type: String,
  reflect: true
})], u3.prototype, "variant", void 0), e9([n4({
  type: String,
  reflect: true
})], u3.prototype, "fixed", void 0), e9([n4({
  type: Boolean,
  reflect: true
})], u3.prototype, "subtle", void 0), e9([n4({
  type: Boolean,
  reflect: true
})], u3.prototype, "outline", void 0);

// deps/swc/swc-dist/components/badge/Badge2.js
var u4;
var d4 = class extends u3 {
  constructor(...e14) {
    super(...e14), this.variant = "neutral";
  }
  static get styles() {
    return [t3];
  }
  render() {
    return b2`
      <div
        class=${e7({
      "swc-Badge": true,
      [`swc-Badge--${this.variant}`]: this.variant !== void 0,
      "swc-Badge--subtle": this.subtle,
      "swc-Badge--outline": this.outline,
      [`swc-Badge--fixed-${this.fixed}`]: this.fixed !== void 0,
      "swc-Badge--no-label": !this.slotHasContent
    })}
      >
        ${n6(this.hasIcon, () => b2`
            <div
              class=${e7({ "swc-Badge-icon": true })}
            >
              <slot name="icon"></slot>
            </div>
          `)}
        <div class="swc-Badge-label">
          <slot></slot>
        </div>
      </div>
    `;
  }
};
u4 = d4, u4.VARIANTS_COLOR = n7, u4.VARIANTS = i6, u4.VALID_SIZES = e8, e([n4({
  type: String,
  reflect: true
})], d4.prototype, "variant", void 0);

// deps/swc/swc-dist/components/badge/swc-badge.js
e10("swc-badge", d4);
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
lit-html/directive.js:
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
lit-html/directives/when.js:
@lit-labs/observers/mutation-controller.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directives/class-map.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
