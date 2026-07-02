// deps/swc/swc-dist/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e(e12, t6, n10, r7) {
  var i9 = arguments.length, a5 = i9 < 3 ? t6 : r7 === null ? r7 = Object.getOwnPropertyDescriptor(t6, n10) : r7, o13;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e12, t6, n10, r7);
  else for (var s5 = e12.length - 1; s5 >= 0; s5--) (o13 = e12[s5]) && (a5 = (i9 < 3 ? o13(a5) : i9 > 3 ? o13(t6, n10, a5) : o13(t6, n10)) || a5);
  return i9 > 3 && a5 && Object.defineProperty(t6, n10, a5), a5;
}

// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e2 = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t6, e12, o13) {
    if (this._$cssResult$ = true, o13 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t6, this.t = e12;
  }
  get styleSheet() {
    let t6 = this.o;
    const s5 = this.t;
    if (e2 && void 0 === t6) {
      const e12 = void 0 !== s5 && 1 === s5.length;
      e12 && (t6 = o.get(s5)), void 0 === t6 && ((this.o = t6 = new CSSStyleSheet()).replaceSync(this.cssText), e12 && o.set(s5, t6));
    }
    return t6;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t6) => new n("string" == typeof t6 ? t6 : t6 + "", void 0, s);
var i = (t6, ...e12) => {
  const o13 = 1 === t6.length ? t6[0] : e12.reduce((e13, s5, o14) => e13 + ((t7) => {
    if (true === t7._$cssResult$) return t7.cssText;
    if ("number" == typeof t7) return t7;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t7 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t6[o14 + 1], t6[0]);
  return new n(o13, t6, s);
};
var S = (s5, o13) => {
  if (e2) s5.adoptedStyleSheets = o13.map((t6) => t6 instanceof CSSStyleSheet ? t6 : t6.styleSheet);
  else for (const e12 of o13) {
    const o14 = document.createElement("style"), n10 = t.litNonce;
    void 0 !== n10 && o14.setAttribute("nonce", n10), o14.textContent = e12.cssText, s5.appendChild(o14);
  }
};
var c = e2 ? (t6) => t6 : (t6) => t6 instanceof CSSStyleSheet ? ((t7) => {
  let e12 = "";
  for (const s5 of t7.cssRules) e12 += s5.cssText;
  return r(e12);
})(t6) : t6;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e3, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t6, s5) => t6;
var u = { toAttribute(t6, s5) {
  switch (s5) {
    case Boolean:
      t6 = t6 ? l : null;
      break;
    case Object:
    case Array:
      t6 = null == t6 ? t6 : JSON.stringify(t6);
  }
  return t6;
}, fromAttribute(t6, s5) {
  let i9 = t6;
  switch (s5) {
    case Boolean:
      i9 = null !== t6;
      break;
    case Number:
      i9 = null === t6 ? null : Number(t6);
      break;
    case Object:
    case Array:
      try {
        i9 = JSON.parse(t6);
      } catch (t7) {
        i9 = null;
      }
  }
  return i9;
} };
var f = (t6, s5) => !i2(t6, s5);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t6) {
    this._$Ei(), (this.l ??= []).push(t6);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t6, s5 = b) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t6) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t6, s5), !s5.noAccessor) {
      const i9 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t6, i9, s5);
      void 0 !== h3 && e3(this.prototype, t6, h3);
    }
  }
  static getPropertyDescriptor(t6, s5, i9) {
    const { get: e12, set: r7 } = h(this.prototype, t6) ?? { get() {
      return this[s5];
    }, set(t7) {
      this[s5] = t7;
    } };
    return { get: e12, set(s6) {
      const h3 = e12?.call(this);
      r7?.call(this, s6), this.requestUpdate(t6, h3, i9);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t6) {
    return this.elementProperties.get(t6) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t6 = n2(this);
    t6.finalize(), void 0 !== t6.l && (this.l = [...t6.l]), this.elementProperties = new Map(t6.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t7 = this.properties, s5 = [...r2(t7), ...o2(t7)];
      for (const i9 of s5) this.createProperty(i9, t7[i9]);
    }
    const t6 = this[Symbol.metadata];
    if (null !== t6) {
      const s5 = litPropertyMetadata.get(t6);
      if (void 0 !== s5) for (const [t7, i9] of s5) this.elementProperties.set(t7, i9);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t7, s5] of this.elementProperties) {
      const i9 = this._$Eu(t7, s5);
      void 0 !== i9 && this._$Eh.set(i9, t7);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s5) {
    const i9 = [];
    if (Array.isArray(s5)) {
      const e12 = new Set(s5.flat(1 / 0).reverse());
      for (const s6 of e12) i9.unshift(c(s6));
    } else void 0 !== s5 && i9.push(c(s5));
    return i9;
  }
  static _$Eu(t6, s5) {
    const i9 = s5.attribute;
    return false === i9 ? void 0 : "string" == typeof i9 ? i9 : "string" == typeof t6 ? t6.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t6) => this.enableUpdating = t6), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t6) => t6(this));
  }
  addController(t6) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t6), void 0 !== this.renderRoot && this.isConnected && t6.hostConnected?.();
  }
  removeController(t6) {
    this._$EO?.delete(t6);
  }
  _$E_() {
    const t6 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i9 of s5.keys()) this.hasOwnProperty(i9) && (t6.set(i9, this[i9]), delete this[i9]);
    t6.size > 0 && (this._$Ep = t6);
  }
  createRenderRoot() {
    const t6 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t6, this.constructor.elementStyles), t6;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t6) => t6.hostConnected?.());
  }
  enableUpdating(t6) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t6) => t6.hostDisconnected?.());
  }
  attributeChangedCallback(t6, s5, i9) {
    this._$AK(t6, i9);
  }
  _$ET(t6, s5) {
    const i9 = this.constructor.elementProperties.get(t6), e12 = this.constructor._$Eu(t6, i9);
    if (void 0 !== e12 && true === i9.reflect) {
      const h3 = (void 0 !== i9.converter?.toAttribute ? i9.converter : u).toAttribute(s5, i9.type);
      this._$Em = t6, null == h3 ? this.removeAttribute(e12) : this.setAttribute(e12, h3), this._$Em = null;
    }
  }
  _$AK(t6, s5) {
    const i9 = this.constructor, e12 = i9._$Eh.get(t6);
    if (void 0 !== e12 && this._$Em !== e12) {
      const t7 = i9.getPropertyOptions(e12), h3 = "function" == typeof t7.converter ? { fromAttribute: t7.converter } : void 0 !== t7.converter?.fromAttribute ? t7.converter : u;
      this._$Em = e12;
      const r7 = h3.fromAttribute(s5, t7.type);
      this[e12] = r7 ?? this._$Ej?.get(e12) ?? r7, this._$Em = null;
    }
  }
  requestUpdate(t6, s5, i9, e12 = false, h3) {
    if (void 0 !== t6) {
      const r7 = this.constructor;
      if (false === e12 && (h3 = this[t6]), i9 ??= r7.getPropertyOptions(t6), !((i9.hasChanged ?? f)(h3, s5) || i9.useDefault && i9.reflect && h3 === this._$Ej?.get(t6) && !this.hasAttribute(r7._$Eu(t6, i9)))) return;
      this.C(t6, s5, i9);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t6, s5, { useDefault: i9, reflect: e12, wrapped: h3 }, r7) {
    i9 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t6) && (this._$Ej.set(t6, r7 ?? s5 ?? this[t6]), true !== h3 || void 0 !== r7) || (this._$AL.has(t6) || (this.hasUpdated || i9 || (s5 = void 0), this._$AL.set(t6, s5)), true === e12 && this._$Em !== t6 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t6));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t7) {
      Promise.reject(t7);
    }
    const t6 = this.scheduleUpdate();
    return null != t6 && await t6, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t8, s6] of this._$Ep) this[t8] = s6;
        this._$Ep = void 0;
      }
      const t7 = this.constructor.elementProperties;
      if (t7.size > 0) for (const [s6, i9] of t7) {
        const { wrapped: t8 } = i9, e12 = this[s6];
        true !== t8 || this._$AL.has(s6) || void 0 === e12 || this.C(s6, void 0, i9, e12);
      }
    }
    let t6 = false;
    const s5 = this._$AL;
    try {
      t6 = this.shouldUpdate(s5), t6 ? (this.willUpdate(s5), this._$EO?.forEach((t7) => t7.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t6 = false, this._$EM(), s6;
    }
    t6 && this._$AE(s5);
  }
  willUpdate(t6) {
  }
  _$AE(t6) {
    this._$EO?.forEach((t7) => t7.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t6)), this.updated(t6);
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
  shouldUpdate(t6) {
    return true;
  }
  update(t6) {
    this._$Eq &&= this._$Eq.forEach((t7) => this._$ET(t7, this[t7])), this._$EM();
  }
  updated(t6) {
  }
  firstUpdated(t6) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t6) => t6;
var s2 = t2.trustedTypes;
var e4 = s2 ? s2.createPolicy("lit-html", { createHTML: (t6) => t6 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t6) => null === t6 || "object" != typeof t6 && "function" != typeof t6;
var u2 = Array.isArray;
var d2 = (t6) => u2(t6) || "function" == typeof t6?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t6) => (i9, ...s5) => ({ _$litType$: t6, strings: i9, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t6, i9) {
  if (!u2(t6) || !t6.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e4 ? e4.createHTML(i9) : i9;
}
var N = (t6, i9) => {
  const s5 = t6.length - 1, e12 = [];
  let n10, l3 = 2 === i9 ? "<svg>" : 3 === i9 ? "<math>" : "", c4 = v;
  for (let i10 = 0; i10 < s5; i10++) {
    const s6 = t6[i10];
    let a5, u3, d4 = -1, f3 = 0;
    for (; f3 < s6.length && (c4.lastIndex = f3, u3 = c4.exec(s6), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n10 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n10 ?? v, d4 = -1) : void 0 === u3[1] ? d4 = -2 : (d4 = c4.lastIndex - u3[2].length, a5 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n10 = void 0);
    const x2 = c4 === p2 && t6[i10 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s6 + r3 : d4 >= 0 ? (e12.push(a5), s6.slice(0, d4) + h2 + s6.slice(d4) + o3 + x2) : s6 + o3 + (-2 === d4 ? i10 : x2);
  }
  return [V(t6, l3 + (t6[s5] || "<?>") + (2 === i9 ? "</svg>" : 3 === i9 ? "</math>" : "")), e12];
};
var S2 = class _S {
  constructor({ strings: t6, _$litType$: i9 }, e12) {
    let r7;
    this.parts = [];
    let l3 = 0, a5 = 0;
    const u3 = t6.length - 1, d4 = this.parts, [f3, v2] = N(t6, i9);
    if (this.el = _S.createElement(f3, e12), P.currentNode = this.el.content, 2 === i9 || 3 === i9) {
      const t7 = this.el.content.firstChild;
      t7.replaceWith(...t7.childNodes);
    }
    for (; null !== (r7 = P.nextNode()) && d4.length < u3; ) {
      if (1 === r7.nodeType) {
        if (r7.hasAttributes()) for (const t7 of r7.getAttributeNames()) if (t7.endsWith(h2)) {
          const i10 = v2[a5++], s5 = r7.getAttribute(t7).split(o3), e13 = /([.?@])?(.*)/.exec(i10);
          d4.push({ type: 1, index: l3, name: e13[2], strings: s5, ctor: "." === e13[1] ? I : "?" === e13[1] ? L : "@" === e13[1] ? z : H }), r7.removeAttribute(t7);
        } else t7.startsWith(o3) && (d4.push({ type: 6, index: l3 }), r7.removeAttribute(t7));
        if (y2.test(r7.tagName)) {
          const t7 = r7.textContent.split(o3), i10 = t7.length - 1;
          if (i10 > 0) {
            r7.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i10; s5++) r7.append(t7[s5], c3()), P.nextNode(), d4.push({ type: 2, index: ++l3 });
            r7.append(t7[i10], c3());
          }
        }
      } else if (8 === r7.nodeType) if (r7.data === n3) d4.push({ type: 2, index: l3 });
      else {
        let t7 = -1;
        for (; -1 !== (t7 = r7.data.indexOf(o3, t7 + 1)); ) d4.push({ type: 7, index: l3 }), t7 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t6, i9) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t6, s5;
  }
};
function M(t6, i9, s5 = t6, e12) {
  if (i9 === E) return i9;
  let h3 = void 0 !== e12 ? s5._$Co?.[e12] : s5._$Cl;
  const o13 = a2(i9) ? void 0 : i9._$litDirective$;
  return h3?.constructor !== o13 && (h3?._$AO?.(false), void 0 === o13 ? h3 = void 0 : (h3 = new o13(t6), h3._$AT(t6, s5, e12)), void 0 !== e12 ? (s5._$Co ??= [])[e12] = h3 : s5._$Cl = h3), void 0 !== h3 && (i9 = M(t6, h3._$AS(t6, i9.values), h3, e12)), i9;
}
var R = class {
  constructor(t6, i9) {
    this._$AV = [], this._$AN = void 0, this._$AD = t6, this._$AM = i9;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t6) {
    const { el: { content: i9 }, parts: s5 } = this._$AD, e12 = (t6?.creationScope ?? l2).importNode(i9, true);
    P.currentNode = e12;
    let h3 = P.nextNode(), o13 = 0, n10 = 0, r7 = s5[0];
    for (; void 0 !== r7; ) {
      if (o13 === r7.index) {
        let i10;
        2 === r7.type ? i10 = new k(h3, h3.nextSibling, this, t6) : 1 === r7.type ? i10 = new r7.ctor(h3, r7.name, r7.strings, this, t6) : 6 === r7.type && (i10 = new Z(h3, this, t6)), this._$AV.push(i10), r7 = s5[++n10];
      }
      o13 !== r7?.index && (h3 = P.nextNode(), o13++);
    }
    return P.currentNode = l2, e12;
  }
  p(t6) {
    let i9 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t6, s5, i9), i9 += s5.strings.length - 2) : s5._$AI(t6[i9])), i9++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t6, i9, s5, e12) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t6, this._$AB = i9, this._$AM = s5, this.options = e12, this._$Cv = e12?.isConnected ?? true;
  }
  get parentNode() {
    let t6 = this._$AA.parentNode;
    const i9 = this._$AM;
    return void 0 !== i9 && 11 === t6?.nodeType && (t6 = i9.parentNode), t6;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t6, i9 = this) {
    t6 = M(this, t6, i9), a2(t6) ? t6 === A || null == t6 || "" === t6 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t6 !== this._$AH && t6 !== E && this._(t6) : void 0 !== t6._$litType$ ? this.$(t6) : void 0 !== t6.nodeType ? this.T(t6) : d2(t6) ? this.k(t6) : this._(t6);
  }
  O(t6) {
    return this._$AA.parentNode.insertBefore(t6, this._$AB);
  }
  T(t6) {
    this._$AH !== t6 && (this._$AR(), this._$AH = this.O(t6));
  }
  _(t6) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t6 : this.T(l2.createTextNode(t6)), this._$AH = t6;
  }
  $(t6) {
    const { values: i9, _$litType$: s5 } = t6, e12 = "number" == typeof s5 ? this._$AC(t6) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e12) this._$AH.p(i9);
    else {
      const t7 = new R(e12, this), s6 = t7.u(this.options);
      t7.p(i9), this.T(s6), this._$AH = t7;
    }
  }
  _$AC(t6) {
    let i9 = C.get(t6.strings);
    return void 0 === i9 && C.set(t6.strings, i9 = new S2(t6)), i9;
  }
  k(t6) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i9 = this._$AH;
    let s5, e12 = 0;
    for (const h3 of t6) e12 === i9.length ? i9.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i9[e12], s5._$AI(h3), e12++;
    e12 < i9.length && (this._$AR(s5 && s5._$AB.nextSibling, e12), i9.length = e12);
  }
  _$AR(t6 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t6 !== this._$AB; ) {
      const s6 = i3(t6).nextSibling;
      i3(t6).remove(), t6 = s6;
    }
  }
  setConnected(t6) {
    void 0 === this._$AM && (this._$Cv = t6, this._$AP?.(t6));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t6, i9, s5, e12, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t6, this.name = i9, this._$AM = e12, this.options = h3, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t6, i9 = this, s5, e12) {
    const h3 = this.strings;
    let o13 = false;
    if (void 0 === h3) t6 = M(this, t6, i9, 0), o13 = !a2(t6) || t6 !== this._$AH && t6 !== E, o13 && (this._$AH = t6);
    else {
      const e13 = t6;
      let n10, r7;
      for (t6 = h3[0], n10 = 0; n10 < h3.length - 1; n10++) r7 = M(this, e13[s5 + n10], i9, n10), r7 === E && (r7 = this._$AH[n10]), o13 ||= !a2(r7) || r7 !== this._$AH[n10], r7 === A ? t6 = A : t6 !== A && (t6 += (r7 ?? "") + h3[n10 + 1]), this._$AH[n10] = r7;
    }
    o13 && !e12 && this.j(t6);
  }
  j(t6) {
    t6 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t6 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t6) {
    this.element[this.name] = t6 === A ? void 0 : t6;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t6) {
    this.element.toggleAttribute(this.name, !!t6 && t6 !== A);
  }
};
var z = class extends H {
  constructor(t6, i9, s5, e12, h3) {
    super(t6, i9, s5, e12, h3), this.type = 5;
  }
  _$AI(t6, i9 = this) {
    if ((t6 = M(this, t6, i9, 0) ?? A) === E) return;
    const s5 = this._$AH, e12 = t6 === A && s5 !== A || t6.capture !== s5.capture || t6.once !== s5.once || t6.passive !== s5.passive, h3 = t6 !== A && (s5 === A || e12);
    e12 && this.element.removeEventListener(this.name, this, s5), h3 && this.element.addEventListener(this.name, this, t6), this._$AH = t6;
  }
  handleEvent(t6) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t6) : this._$AH.handleEvent(t6);
  }
};
var Z = class {
  constructor(t6, i9, s5) {
    this.element = t6, this.type = 6, this._$AN = void 0, this._$AM = i9, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t6) {
    M(this, t6);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.2");
var D = (t6, i9, s5) => {
  const e12 = s5?.renderBefore ?? i9;
  let h3 = e12._$litPart$;
  if (void 0 === h3) {
    const t7 = s5?.renderBefore ?? null;
    e12._$litPart$ = h3 = new k(i9.insertBefore(c3(), t7), t7, void 0, s5 ?? {});
  }
  return h3._$AI(t6), h3;
};

// node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t6 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t6.firstChild, t6;
  }
  update(t6) {
    const r7 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t6), this._$Do = D(r7, this.renderRoot, this.renderOptions);
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
function e6(e12, t6, n10, r7) {
  var i9 = arguments.length, a5 = i9 < 3 ? t6 : r7 === null ? r7 = Object.getOwnPropertyDescriptor(t6, n10) : r7, o13;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e12, t6, n10, r7);
  else for (var s5 = e12.length - 1; s5 >= 0; s5--) (o13 = e12[s5]) && (a5 = (i9 < 3 ? o13(a5) : i9 > 3 ? o13(t6, n10, a5) : o13(t6, n10)) || a5);
  return i9 > 3 && a5 && Object.defineProperty(t6, n10, a5), a5;
}

// node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t6 = o5, e12, r7) => {
  const { kind: n10, metadata: i9 } = r7;
  let s5 = globalThis.litPropertyMetadata.get(i9);
  if (void 0 === s5 && globalThis.litPropertyMetadata.set(i9, s5 = /* @__PURE__ */ new Map()), "setter" === n10 && ((t6 = Object.create(t6)).wrapped = true), s5.set(r7.name, t6), "accessor" === n10) {
    const { name: o13 } = r7;
    return { set(r8) {
      const n11 = e12.get.call(this);
      e12.set.call(this, r8), this.requestUpdate(o13, n11, t6, true, r8);
    }, init(e13) {
      return void 0 !== e13 && this.C(o13, void 0, t6, e13), e13;
    } };
  }
  if ("setter" === n10) {
    const { name: o13 } = r7;
    return function(r8) {
      const n11 = this[o13];
      e12.call(this, r8), this.requestUpdate(o13, n11, t6, true, r8);
    };
  }
  throw Error("Unsupported decorator location: " + n10);
};
function n4(t6) {
  return (e12, o13) => "object" == typeof o13 ? r4(t6, e12, o13) : ((t7, e13, o14) => {
    const r7 = e13.hasOwnProperty(o14);
    return e13.constructor.createProperty(o14, t7), r7 ? Object.getOwnPropertyDescriptor(e13, o14) : void 0;
  })(t6, e12, o13);
}

// node_modules/@lit/reactive-element/decorators/base.js
var e7 = (e12, t6, c4) => (c4.configurable = true, c4.enumerable = true, Reflect.decorate && "object" != typeof t6 && Object.defineProperty(e12, t6, c4), c4);

// node_modules/@lit/reactive-element/decorators/query-assigned-elements.js
function o6(o13) {
  return (e12, n10) => {
    const { slot: r7, selector: s5 } = o13 ?? {}, c4 = "slot" + (r7 ? `[name=${r7}]` : ":not([name])");
    return e7(e12, n10, { get() {
      const t6 = this.renderRoot?.querySelector(c4), e13 = t6?.assignedElements(o13) ?? [];
      return void 0 === s5 ? e13 : e13.filter((t7) => t7.matches(s5));
    } });
  };
}

// deps/swc/swc-dist/core/element/define-element.js
function e8(e12, t6) {
  window.__swc && window.__swc.DEBUG && customElements.get(e12) && window.__swc.warn(void 0, `Attempted to redefine <${e12}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e12, t6);
}

// deps/swc/swc-dist/core/element/version.js
var e9 = "0.1.0";
var t4 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e10(e12 = document) {
  var t6;
  let n10 = e12.activeElement;
  for (; !(n10 == null || (t6 = n10.shadowRoot) == null) && t6.activeElement; ) n10 = n10.shadowRoot.activeElement;
  return n10;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i5;
function a3(t6) {
  class n10 extends t6 {
    hasVisibleFocusInTree() {
      var t7;
      let n11 = e10(this.getRootNode());
      return (t7 = n11 == null ? void 0 : n11.matches(":focus-visible")) == null ? false : t7;
    }
  }
  return n10;
}
var o7 = class extends a3(i4) {
  get dir() {
    var e12;
    return (e12 = getComputedStyle(this).direction) == null ? "ltr" : e12;
  }
};
if (i5 = o7, i5.VERSION = e9, i5.CORE_VERSION = t4, true) {
  let e12 = {
    default: false,
    accessibility: false,
    api: false
  }, t6 = {
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
      ...e12,
      ...((c4 = window.__swc) == null ? void 0 : c4.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t6,
      ...((l3 = window.__swc) == null ? void 0 : l3.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e13, t7, n10, { type: r7 = "api", level: i9 = "default", issues: a5 } = {}) => {
      let { localName: o13 = "base" } = e13 || {}, s6 = `${o13}:${r7}:${i9}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s6) || window.__swc.ignoreWarningLocalNames[o13] || window.__swc.ignoreWarningTypes[r7] || window.__swc.ignoreWarningLevels[i9]) return;
      window.__swc.issuedWarnings.add(s6);
      let c5 = "";
      a5 && a5.length && (a5.unshift(""), c5 = a5.join("\n    - ") + "\n");
      let l4 = i9 === "deprecation" ? "DEPRECATION NOTICE: " : "", u3 = e13 ? "\nInspect this issue in the follow element:" : "", d4 = (e13 ? "\n\n" : "\n") + n10 + "\n", f3 = [];
      f3.push(l4 + t7 + "\n" + c5 + u3), e13 && f3.push(e13), f3.push(d4, { data: {
        localName: o13,
        type: r7,
        level: i9
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s5;
var c4;
var l3;

// deps/swc/swc-dist/core/mixins/sized-mixin.js
var r5 = [
  "s",
  "m",
  "l",
  "xl"
];
function i7(n10, { validSizes: i9 = [...r5], noDefaultSize: a5, defaultSize: o13 = "m" } = {}) {
  var s5;
  class c4 extends n10 {
    constructor(...e12) {
      super(...e12), this._size = o13;
    }
    get size() {
      return this._size || o13;
    }
    set size(e12) {
      let t6 = a5 ? null : o13, n11 = e12 && e12.toLocaleLowerCase(), r7 = this.constructor.VALID_SIZES.includes(n11) ? n11 : t6;
      if (r7 && this.setAttribute("size", r7), this._size === r7) return;
      let i10 = this._size;
      this._size = r7, this.requestUpdate("size", i10);
    }
    update(e12) {
      !this.hasAttribute("size") && !a5 && this.setAttribute("size", this.size), super.update(e12);
    }
  }
  return s5 = c4, s5.VALID_SIZES = i9, e6([n4({ type: String })], c4.prototype, "size", null), c4;
}

// deps/swc/swc-dist/core/components/icon/Icon.base.js
var o11 = class extends i7(o7, { validSizes: [...e5] }) {
  constructor(...e12) {
    super(...e12), this.label = "";
  }
  firstUpdated(e12) {
    super.firstUpdated(e12), this.updateSlottedIcon(), this.updateHostAccessibility();
  }
  updated(e12) {
    super.updated(e12), e12.has("label") && (this.updateSlottedIcon(), this.updateHostAccessibility());
  }
  handleSlotChange() {
    this.updateSlottedIcon();
  }
  updateSlottedIcon() {
    var e12;
    let [t6] = this.defaultSlotElements;
    if (!t6) return;
    let n10 = t6 instanceof SVGElement ? t6 : (e12 = t6.querySelector) == null ? void 0 : e12.call(t6, "svg");
    n10 && (n10.setAttribute("role", "img"), this.label ? (n10.setAttribute("aria-label", this.label), n10.removeAttribute("aria-hidden")) : (n10.setAttribute("aria-hidden", "true"), n10.removeAttribute("aria-label")));
  }
  updateHostAccessibility() {
    this.label ? this.removeAttribute("aria-hidden") : this.setAttribute("aria-hidden", "true");
  }
};
e6([n4({ type: String })], o11.prototype, "label", void 0), e6([o6({ flatten: true })], o11.prototype, "defaultSlotElements", void 0);

// deps/swc/swc-dist/components/icon/Icon2.js
var r6 = class extends o11 {
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
e8("swc-icon", r6);

// deps/swc/swc-dist/patterns/conversational-ai/utils/icons/index.js
var n9 = () => b2`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
    <path
      fill="currentColor"
      d="M6.28901 5L9.21143 2.07715C9.56739 1.7207 9.56739 1.14356 9.21143 0.788087C8.85498 0.432617 8.27784 0.432617 7.92237 0.788087L5.00001 3.71094L2.07765 0.788087C1.72218 0.432617 1.14503 0.432617 0.788586 0.788087C0.432626 1.14356 0.432626 1.72071 0.788586 2.07715L3.71101 5L0.788576 7.92285C0.432616 8.2793 0.432616 8.85644 0.788576 9.21191C0.966796 9.38964 1.19971 9.47851 1.43311 9.47851C1.66651 9.47851 1.89991 9.38964 2.07764 9.21191L5 6.28906L7.92236 9.21191C8.10009 9.38964 8.33349 9.47851 8.56689 9.47851C8.80029 9.47851 9.0332 9.38964 9.21142 9.21191C9.56738 8.85644 9.56738 8.27929 9.21142 7.92285L6.28901 5Z"
    />
  </svg>
`;

// deps/swc/swc-dist/patterns/conversational-ai/upload-artifact/upload-artifact.js
var t5 = i`:host{display:block;position:relative;max-inline-size:100%}*,*:before,*:after{box-sizing:border-box}.swc-UploadArtifact-dismiss{display:flex;position:absolute;inset-block-start:-12px;inset-inline-end:-12px;z-index:1;align-items:center;justify-content:center;inline-size:var(--swc-upload-artifact-dismiss-inline-size, 24px);block-size:var(--swc-upload-artifact-dismiss-block-size, 24px);padding:0;color:var(--swc-gray-800);background:var(--swc-gray-200);border:1px solid var(--swc-gray-25);border-radius:50%}.swc-UploadArtifact-dismiss[hidden]{display:none}.swc-UploadArtifact-dismiss:hover{background:var(--swc-gray-300)}.swc-UploadArtifact-dismiss swc-icon{--swc-icon-inline-size: var(--swc-upload-artifact-dismiss-icon-inline-size, 10px);--swc-icon-block-size: var(--swc-upload-artifact-dismiss-icon-block-size, 10px)}.swc-UploadArtifact-surface{display:flex;background:var(--swc-gray-50)}.swc-UploadArtifact-meta{display:flex;flex-direction:column;gap:2px;min-inline-size:0}.swc-UploadArtifact-meta[hidden]{display:none}.swc-UploadArtifact-title{font-family:var(--swc-sans-font-family-stack);font-size:var(--swc-font-size-100);font-weight:700;line-height:var(--swc-line-height-font-size-100);color:var(--swc-gray-900)}.swc-UploadArtifact-subtitle{font-family:var(--swc-sans-font-family-stack);font-size:var(--swc-font-size-75);font-weight:400;line-height:var(--swc-line-height-font-size-75);color:var(--swc-gray-800)}.swc-UploadArtifact-actions{display:flex;align-items:center}.swc-UploadArtifact-actions ::slotted(*){display:inline-flex;align-items:center}:host([type=\"card\"]) .swc-UploadArtifact-surface{gap:16px;align-items:center;min-block-size:var(--swc-upload-artifact-card-min-block-size, 68px);padding:16px;border:1px solid transparent;border-radius:10px}:host([type=\"card\"]) .swc-UploadArtifact-thumbnail{display:flex;flex-shrink:0;align-items:center;justify-content:center}:host([type=\"card\"]) .swc-UploadArtifact-thumbnail ::slotted(*){box-sizing:border-box;flex-shrink:0;inline-size:var(--swc-upload-artifact-card-thumbnail-inline-size, 32px);block-size:var(--swc-upload-artifact-card-thumbnail-block-size, 32px);background:var(--swc-gray-100);border:1px solid transparent;border-radius:3px}:host([type=\"card\"]) .swc-UploadArtifact-meta{flex:1;align-items:flex-start}:host([type=\"card\"]) .swc-UploadArtifact-title,:host([type=\"card\"]) .swc-UploadArtifact-subtitle{inline-size:100%;min-inline-size:0;text-align:start}:host([type=\"card\"]) .swc-UploadArtifact-title ::slotted(*){display:block;min-inline-size:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}:host([type=\"card\"]) .swc-UploadArtifact-subtitle ::slotted(*){display:block;min-inline-size:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}:host([type=\"media\"]){inline-size:var(--swc-upload-artifact-preview-size, 68px);block-size:var(--swc-upload-artifact-preview-size, 68px)}:host([type=\"media\"]) .swc-UploadArtifact{inline-size:100%;block-size:100%}:host([type=\"media\"]) .swc-UploadArtifact-surface{flex-direction:column;gap:8px;overflow:hidden}:host([type=\"media\"]) .swc-UploadArtifact-thumbnail{background:var(--swc-gray-100);border:1px solid transparent;border-radius:5px;overflow:hidden}:host([type=\"media\"]) .swc-UploadArtifact-thumbnail ::slotted(img){display:block;inline-size:100%;block-size:auto;-o-object-fit:cover;object-fit:cover}:host([type=\"media\"]) .swc-UploadArtifact-thumbnail ::slotted(*){display:block;inline-size:100%;block-size:100%}:host([type=\"media\"]) .swc-UploadArtifact-meta{inline-size:100%}:host([type=\"media\"]) .swc-UploadArtifact-header{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}:host([type=\"media\"]) .swc-UploadArtifact-header>div{min-inline-size:0}:host([type=\"media\"]) .swc-UploadArtifact-title{flex:1 1 0;min-inline-size:0;line-height:var(--swc-line-height-font-size-100);overflow:hidden}:host([type=\"media\"]) .swc-UploadArtifact-title ::slotted(*){display:block;min-inline-size:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}:host([type=\"media\"]) .swc-UploadArtifact-subtitle{line-height:var(--swc-line-height-font-size-75)}`;

// deps/swc/swc-dist/patterns/conversational-ai/upload-artifact/UploadArtifact.js
var o12 = class extends o7 {
  constructor(...e12) {
    super(...e12), this.type = "card", this.dismissible = false, this.dismissLabel = "Remove attachment";
  }
  static get styles() {
    return [t5];
  }
  _handleDismissClick() {
    this.dispatchEvent(new CustomEvent("swc-upload-artifact-dismiss", {
      bubbles: true,
      composed: true,
      detail: { artifact: this }
    }));
  }
  render() {
    let e12 = this.type === "media";
    return b2`
      <div class="swc-UploadArtifact">
        <button
          class="swc-UploadArtifact-dismiss"
          aria-label=${this.dismissLabel}
          ?hidden=${!this.dismissible}
          @click=${this._handleDismissClick}
        >
          <swc-icon aria-hidden="true">${n9()}</swc-icon>
        </button>

        <div class="swc-UploadArtifact-surface">
          <div class="swc-UploadArtifact-thumbnail">
            <slot name="thumbnail"></slot>
          </div>

          ${e12 ? b2`
                <div class="swc-UploadArtifact-actions">
                  <slot name="actions"></slot>
                </div>
              ` : b2`
                <div class="swc-UploadArtifact-meta">
                  <div class="swc-UploadArtifact-title">
                    <slot name="title"></slot>
                  </div>
                  <div class="swc-UploadArtifact-subtitle">
                    <slot name="subtitle"></slot>
                  </div>
                </div>

                <div class="swc-UploadArtifact-actions">
                  <slot name="actions"></slot>
                </div>
              `}
        </div>
      </div>
    `;
  }
};
e([n4({
  type: String,
  reflect: true
})], o12.prototype, "type", void 0), e([n4({
  type: Boolean,
  reflect: true
})], o12.prototype, "dismissible", void 0), e([n4({
  type: String,
  attribute: "dismiss-label"
})], o12.prototype, "dismissLabel", void 0);

// deps/swc/swc-dist/patterns/conversational-ai/upload-artifact/index.js
e8("swc-upload-artifact", o12);
export {
  o12 as UploadArtifact
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
