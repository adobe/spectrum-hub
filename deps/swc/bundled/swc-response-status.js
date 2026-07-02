// deps/swc/swc-dist/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e(e21, t12, n10, r9) {
  var i10 = arguments.length, a6 = i10 < 3 ? t12 : r9 === null ? r9 = Object.getOwnPropertyDescriptor(t12, n10) : r9, o13;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a6 = Reflect.decorate(e21, t12, n10, r9);
  else for (var s6 = e21.length - 1; s6 >= 0; s6--) (o13 = e21[s6]) && (a6 = (i10 < 3 ? o13(a6) : i10 > 3 ? o13(t12, n10, a6) : o13(t12, n10)) || a6);
  return i10 > 3 && a6 && Object.defineProperty(t12, n10, a6), a6;
}

// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e2 = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t12, e21, o13) {
    if (this._$cssResult$ = true, o13 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t12, this.t = e21;
  }
  get styleSheet() {
    let t12 = this.o;
    const s6 = this.t;
    if (e2 && void 0 === t12) {
      const e21 = void 0 !== s6 && 1 === s6.length;
      e21 && (t12 = o.get(s6)), void 0 === t12 && ((this.o = t12 = new CSSStyleSheet()).replaceSync(this.cssText), e21 && o.set(s6, t12));
    }
    return t12;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t12) => new n("string" == typeof t12 ? t12 : t12 + "", void 0, s);
var i = (t12, ...e21) => {
  const o13 = 1 === t12.length ? t12[0] : e21.reduce((e22, s6, o14) => e22 + ((t13) => {
    if (true === t13._$cssResult$) return t13.cssText;
    if ("number" == typeof t13) return t13;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t13 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s6) + t12[o14 + 1], t12[0]);
  return new n(o13, t12, s);
};
var S = (s6, o13) => {
  if (e2) s6.adoptedStyleSheets = o13.map((t12) => t12 instanceof CSSStyleSheet ? t12 : t12.styleSheet);
  else for (const e21 of o13) {
    const o14 = document.createElement("style"), n10 = t.litNonce;
    void 0 !== n10 && o14.setAttribute("nonce", n10), o14.textContent = e21.cssText, s6.appendChild(o14);
  }
};
var c = e2 ? (t12) => t12 : (t12) => t12 instanceof CSSStyleSheet ? ((t13) => {
  let e21 = "";
  for (const s6 of t13.cssRules) e21 += s6.cssText;
  return r(e21);
})(t12) : t12;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e3, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t12, s6) => t12;
var u = { toAttribute(t12, s6) {
  switch (s6) {
    case Boolean:
      t12 = t12 ? l : null;
      break;
    case Object:
    case Array:
      t12 = null == t12 ? t12 : JSON.stringify(t12);
  }
  return t12;
}, fromAttribute(t12, s6) {
  let i10 = t12;
  switch (s6) {
    case Boolean:
      i10 = null !== t12;
      break;
    case Number:
      i10 = null === t12 ? null : Number(t12);
      break;
    case Object:
    case Array:
      try {
        i10 = JSON.parse(t12);
      } catch (t13) {
        i10 = null;
      }
  }
  return i10;
} };
var f = (t12, s6) => !i2(t12, s6);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t12) {
    this._$Ei(), (this.l ??= []).push(t12);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t12, s6 = b) {
    if (s6.state && (s6.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t12) && ((s6 = Object.create(s6)).wrapped = true), this.elementProperties.set(t12, s6), !s6.noAccessor) {
      const i10 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t12, i10, s6);
      void 0 !== h3 && e3(this.prototype, t12, h3);
    }
  }
  static getPropertyDescriptor(t12, s6, i10) {
    const { get: e21, set: r9 } = h(this.prototype, t12) ?? { get() {
      return this[s6];
    }, set(t13) {
      this[s6] = t13;
    } };
    return { get: e21, set(s7) {
      const h3 = e21?.call(this);
      r9?.call(this, s7), this.requestUpdate(t12, h3, i10);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t12) {
    return this.elementProperties.get(t12) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t12 = n2(this);
    t12.finalize(), void 0 !== t12.l && (this.l = [...t12.l]), this.elementProperties = new Map(t12.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t13 = this.properties, s6 = [...r2(t13), ...o2(t13)];
      for (const i10 of s6) this.createProperty(i10, t13[i10]);
    }
    const t12 = this[Symbol.metadata];
    if (null !== t12) {
      const s6 = litPropertyMetadata.get(t12);
      if (void 0 !== s6) for (const [t13, i10] of s6) this.elementProperties.set(t13, i10);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t13, s6] of this.elementProperties) {
      const i10 = this._$Eu(t13, s6);
      void 0 !== i10 && this._$Eh.set(i10, t13);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s6) {
    const i10 = [];
    if (Array.isArray(s6)) {
      const e21 = new Set(s6.flat(1 / 0).reverse());
      for (const s7 of e21) i10.unshift(c(s7));
    } else void 0 !== s6 && i10.push(c(s6));
    return i10;
  }
  static _$Eu(t12, s6) {
    const i10 = s6.attribute;
    return false === i10 ? void 0 : "string" == typeof i10 ? i10 : "string" == typeof t12 ? t12.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t12) => this.enableUpdating = t12), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t12) => t12(this));
  }
  addController(t12) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t12), void 0 !== this.renderRoot && this.isConnected && t12.hostConnected?.();
  }
  removeController(t12) {
    this._$EO?.delete(t12);
  }
  _$E_() {
    const t12 = /* @__PURE__ */ new Map(), s6 = this.constructor.elementProperties;
    for (const i10 of s6.keys()) this.hasOwnProperty(i10) && (t12.set(i10, this[i10]), delete this[i10]);
    t12.size > 0 && (this._$Ep = t12);
  }
  createRenderRoot() {
    const t12 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t12, this.constructor.elementStyles), t12;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t12) => t12.hostConnected?.());
  }
  enableUpdating(t12) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t12) => t12.hostDisconnected?.());
  }
  attributeChangedCallback(t12, s6, i10) {
    this._$AK(t12, i10);
  }
  _$ET(t12, s6) {
    const i10 = this.constructor.elementProperties.get(t12), e21 = this.constructor._$Eu(t12, i10);
    if (void 0 !== e21 && true === i10.reflect) {
      const h3 = (void 0 !== i10.converter?.toAttribute ? i10.converter : u).toAttribute(s6, i10.type);
      this._$Em = t12, null == h3 ? this.removeAttribute(e21) : this.setAttribute(e21, h3), this._$Em = null;
    }
  }
  _$AK(t12, s6) {
    const i10 = this.constructor, e21 = i10._$Eh.get(t12);
    if (void 0 !== e21 && this._$Em !== e21) {
      const t13 = i10.getPropertyOptions(e21), h3 = "function" == typeof t13.converter ? { fromAttribute: t13.converter } : void 0 !== t13.converter?.fromAttribute ? t13.converter : u;
      this._$Em = e21;
      const r9 = h3.fromAttribute(s6, t13.type);
      this[e21] = r9 ?? this._$Ej?.get(e21) ?? r9, this._$Em = null;
    }
  }
  requestUpdate(t12, s6, i10, e21 = false, h3) {
    if (void 0 !== t12) {
      const r9 = this.constructor;
      if (false === e21 && (h3 = this[t12]), i10 ??= r9.getPropertyOptions(t12), !((i10.hasChanged ?? f)(h3, s6) || i10.useDefault && i10.reflect && h3 === this._$Ej?.get(t12) && !this.hasAttribute(r9._$Eu(t12, i10)))) return;
      this.C(t12, s6, i10);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t12, s6, { useDefault: i10, reflect: e21, wrapped: h3 }, r9) {
    i10 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t12) && (this._$Ej.set(t12, r9 ?? s6 ?? this[t12]), true !== h3 || void 0 !== r9) || (this._$AL.has(t12) || (this.hasUpdated || i10 || (s6 = void 0), this._$AL.set(t12, s6)), true === e21 && this._$Em !== t12 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t12));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t13) {
      Promise.reject(t13);
    }
    const t12 = this.scheduleUpdate();
    return null != t12 && await t12, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t14, s7] of this._$Ep) this[t14] = s7;
        this._$Ep = void 0;
      }
      const t13 = this.constructor.elementProperties;
      if (t13.size > 0) for (const [s7, i10] of t13) {
        const { wrapped: t14 } = i10, e21 = this[s7];
        true !== t14 || this._$AL.has(s7) || void 0 === e21 || this.C(s7, void 0, i10, e21);
      }
    }
    let t12 = false;
    const s6 = this._$AL;
    try {
      t12 = this.shouldUpdate(s6), t12 ? (this.willUpdate(s6), this._$EO?.forEach((t13) => t13.hostUpdate?.()), this.update(s6)) : this._$EM();
    } catch (s7) {
      throw t12 = false, this._$EM(), s7;
    }
    t12 && this._$AE(s6);
  }
  willUpdate(t12) {
  }
  _$AE(t12) {
    this._$EO?.forEach((t13) => t13.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t12)), this.updated(t12);
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
  shouldUpdate(t12) {
    return true;
  }
  update(t12) {
    this._$Eq &&= this._$Eq.forEach((t13) => this._$ET(t13, this[t13])), this._$EM();
  }
  updated(t12) {
  }
  firstUpdated(t12) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t12) => t12;
var s2 = t2.trustedTypes;
var e4 = s2 ? s2.createPolicy("lit-html", { createHTML: (t12) => t12 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t12) => null === t12 || "object" != typeof t12 && "function" != typeof t12;
var u2 = Array.isArray;
var d2 = (t12) => u2(t12) || "function" == typeof t12?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t12) => (i10, ...s6) => ({ _$litType$: t12, strings: i10, values: s6 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t12, i10) {
  if (!u2(t12) || !t12.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e4 ? e4.createHTML(i10) : i10;
}
var N = (t12, i10) => {
  const s6 = t12.length - 1, e21 = [];
  let n10, l4 = 2 === i10 ? "<svg>" : 3 === i10 ? "<math>" : "", c5 = v;
  for (let i11 = 0; i11 < s6; i11++) {
    const s7 = t12[i11];
    let a6, u5, d4 = -1, f3 = 0;
    for (; f3 < s7.length && (c5.lastIndex = f3, u5 = c5.exec(s7), null !== u5); ) f3 = c5.lastIndex, c5 === v ? "!--" === u5[1] ? c5 = _ : void 0 !== u5[1] ? c5 = m : void 0 !== u5[2] ? (y2.test(u5[2]) && (n10 = RegExp("</" + u5[2], "g")), c5 = p2) : void 0 !== u5[3] && (c5 = p2) : c5 === p2 ? ">" === u5[0] ? (c5 = n10 ?? v, d4 = -1) : void 0 === u5[1] ? d4 = -2 : (d4 = c5.lastIndex - u5[2].length, a6 = u5[1], c5 = void 0 === u5[3] ? p2 : '"' === u5[3] ? $ : g) : c5 === $ || c5 === g ? c5 = p2 : c5 === _ || c5 === m ? c5 = v : (c5 = p2, n10 = void 0);
    const x2 = c5 === p2 && t12[i11 + 1].startsWith("/>") ? " " : "";
    l4 += c5 === v ? s7 + r3 : d4 >= 0 ? (e21.push(a6), s7.slice(0, d4) + h2 + s7.slice(d4) + o3 + x2) : s7 + o3 + (-2 === d4 ? i11 : x2);
  }
  return [V(t12, l4 + (t12[s6] || "<?>") + (2 === i10 ? "</svg>" : 3 === i10 ? "</math>" : "")), e21];
};
var S2 = class _S {
  constructor({ strings: t12, _$litType$: i10 }, e21) {
    let r9;
    this.parts = [];
    let l4 = 0, a6 = 0;
    const u5 = t12.length - 1, d4 = this.parts, [f3, v2] = N(t12, i10);
    if (this.el = _S.createElement(f3, e21), P.currentNode = this.el.content, 2 === i10 || 3 === i10) {
      const t13 = this.el.content.firstChild;
      t13.replaceWith(...t13.childNodes);
    }
    for (; null !== (r9 = P.nextNode()) && d4.length < u5; ) {
      if (1 === r9.nodeType) {
        if (r9.hasAttributes()) for (const t13 of r9.getAttributeNames()) if (t13.endsWith(h2)) {
          const i11 = v2[a6++], s6 = r9.getAttribute(t13).split(o3), e22 = /([.?@])?(.*)/.exec(i11);
          d4.push({ type: 1, index: l4, name: e22[2], strings: s6, ctor: "." === e22[1] ? I : "?" === e22[1] ? L : "@" === e22[1] ? z : H }), r9.removeAttribute(t13);
        } else t13.startsWith(o3) && (d4.push({ type: 6, index: l4 }), r9.removeAttribute(t13));
        if (y2.test(r9.tagName)) {
          const t13 = r9.textContent.split(o3), i11 = t13.length - 1;
          if (i11 > 0) {
            r9.textContent = s2 ? s2.emptyScript : "";
            for (let s6 = 0; s6 < i11; s6++) r9.append(t13[s6], c3()), P.nextNode(), d4.push({ type: 2, index: ++l4 });
            r9.append(t13[i11], c3());
          }
        }
      } else if (8 === r9.nodeType) if (r9.data === n3) d4.push({ type: 2, index: l4 });
      else {
        let t13 = -1;
        for (; -1 !== (t13 = r9.data.indexOf(o3, t13 + 1)); ) d4.push({ type: 7, index: l4 }), t13 += o3.length - 1;
      }
      l4++;
    }
  }
  static createElement(t12, i10) {
    const s6 = l2.createElement("template");
    return s6.innerHTML = t12, s6;
  }
};
function M(t12, i10, s6 = t12, e21) {
  if (i10 === E) return i10;
  let h3 = void 0 !== e21 ? s6._$Co?.[e21] : s6._$Cl;
  const o13 = a2(i10) ? void 0 : i10._$litDirective$;
  return h3?.constructor !== o13 && (h3?._$AO?.(false), void 0 === o13 ? h3 = void 0 : (h3 = new o13(t12), h3._$AT(t12, s6, e21)), void 0 !== e21 ? (s6._$Co ??= [])[e21] = h3 : s6._$Cl = h3), void 0 !== h3 && (i10 = M(t12, h3._$AS(t12, i10.values), h3, e21)), i10;
}
var R = class {
  constructor(t12, i10) {
    this._$AV = [], this._$AN = void 0, this._$AD = t12, this._$AM = i10;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t12) {
    const { el: { content: i10 }, parts: s6 } = this._$AD, e21 = (t12?.creationScope ?? l2).importNode(i10, true);
    P.currentNode = e21;
    let h3 = P.nextNode(), o13 = 0, n10 = 0, r9 = s6[0];
    for (; void 0 !== r9; ) {
      if (o13 === r9.index) {
        let i11;
        2 === r9.type ? i11 = new k(h3, h3.nextSibling, this, t12) : 1 === r9.type ? i11 = new r9.ctor(h3, r9.name, r9.strings, this, t12) : 6 === r9.type && (i11 = new Z(h3, this, t12)), this._$AV.push(i11), r9 = s6[++n10];
      }
      o13 !== r9?.index && (h3 = P.nextNode(), o13++);
    }
    return P.currentNode = l2, e21;
  }
  p(t12) {
    let i10 = 0;
    for (const s6 of this._$AV) void 0 !== s6 && (void 0 !== s6.strings ? (s6._$AI(t12, s6, i10), i10 += s6.strings.length - 2) : s6._$AI(t12[i10])), i10++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t12, i10, s6, e21) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t12, this._$AB = i10, this._$AM = s6, this.options = e21, this._$Cv = e21?.isConnected ?? true;
  }
  get parentNode() {
    let t12 = this._$AA.parentNode;
    const i10 = this._$AM;
    return void 0 !== i10 && 11 === t12?.nodeType && (t12 = i10.parentNode), t12;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t12, i10 = this) {
    t12 = M(this, t12, i10), a2(t12) ? t12 === A || null == t12 || "" === t12 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t12 !== this._$AH && t12 !== E && this._(t12) : void 0 !== t12._$litType$ ? this.$(t12) : void 0 !== t12.nodeType ? this.T(t12) : d2(t12) ? this.k(t12) : this._(t12);
  }
  O(t12) {
    return this._$AA.parentNode.insertBefore(t12, this._$AB);
  }
  T(t12) {
    this._$AH !== t12 && (this._$AR(), this._$AH = this.O(t12));
  }
  _(t12) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t12 : this.T(l2.createTextNode(t12)), this._$AH = t12;
  }
  $(t12) {
    const { values: i10, _$litType$: s6 } = t12, e21 = "number" == typeof s6 ? this._$AC(t12) : (void 0 === s6.el && (s6.el = S2.createElement(V(s6.h, s6.h[0]), this.options)), s6);
    if (this._$AH?._$AD === e21) this._$AH.p(i10);
    else {
      const t13 = new R(e21, this), s7 = t13.u(this.options);
      t13.p(i10), this.T(s7), this._$AH = t13;
    }
  }
  _$AC(t12) {
    let i10 = C.get(t12.strings);
    return void 0 === i10 && C.set(t12.strings, i10 = new S2(t12)), i10;
  }
  k(t12) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i10 = this._$AH;
    let s6, e21 = 0;
    for (const h3 of t12) e21 === i10.length ? i10.push(s6 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s6 = i10[e21], s6._$AI(h3), e21++;
    e21 < i10.length && (this._$AR(s6 && s6._$AB.nextSibling, e21), i10.length = e21);
  }
  _$AR(t12 = this._$AA.nextSibling, s6) {
    for (this._$AP?.(false, true, s6); t12 !== this._$AB; ) {
      const s7 = i3(t12).nextSibling;
      i3(t12).remove(), t12 = s7;
    }
  }
  setConnected(t12) {
    void 0 === this._$AM && (this._$Cv = t12, this._$AP?.(t12));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t12, i10, s6, e21, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t12, this.name = i10, this._$AM = e21, this.options = h3, s6.length > 2 || "" !== s6[0] || "" !== s6[1] ? (this._$AH = Array(s6.length - 1).fill(new String()), this.strings = s6) : this._$AH = A;
  }
  _$AI(t12, i10 = this, s6, e21) {
    const h3 = this.strings;
    let o13 = false;
    if (void 0 === h3) t12 = M(this, t12, i10, 0), o13 = !a2(t12) || t12 !== this._$AH && t12 !== E, o13 && (this._$AH = t12);
    else {
      const e22 = t12;
      let n10, r9;
      for (t12 = h3[0], n10 = 0; n10 < h3.length - 1; n10++) r9 = M(this, e22[s6 + n10], i10, n10), r9 === E && (r9 = this._$AH[n10]), o13 ||= !a2(r9) || r9 !== this._$AH[n10], r9 === A ? t12 = A : t12 !== A && (t12 += (r9 ?? "") + h3[n10 + 1]), this._$AH[n10] = r9;
    }
    o13 && !e21 && this.j(t12);
  }
  j(t12) {
    t12 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t12 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t12) {
    this.element[this.name] = t12 === A ? void 0 : t12;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t12) {
    this.element.toggleAttribute(this.name, !!t12 && t12 !== A);
  }
};
var z = class extends H {
  constructor(t12, i10, s6, e21, h3) {
    super(t12, i10, s6, e21, h3), this.type = 5;
  }
  _$AI(t12, i10 = this) {
    if ((t12 = M(this, t12, i10, 0) ?? A) === E) return;
    const s6 = this._$AH, e21 = t12 === A && s6 !== A || t12.capture !== s6.capture || t12.once !== s6.once || t12.passive !== s6.passive, h3 = t12 !== A && (s6 === A || e21);
    e21 && this.element.removeEventListener(this.name, this, s6), h3 && this.element.addEventListener(this.name, this, t12), this._$AH = t12;
  }
  handleEvent(t12) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t12) : this._$AH.handleEvent(t12);
  }
};
var Z = class {
  constructor(t12, i10, s6) {
    this.element = t12, this.type = 6, this._$AN = void 0, this._$AM = i10, this.options = s6;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t12) {
    M(this, t12);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.2");
var D = (t12, i10, s6) => {
  const e21 = s6?.renderBefore ?? i10;
  let h3 = e21._$litPart$;
  if (void 0 === h3) {
    const t13 = s6?.renderBefore ?? null;
    e21._$litPart$ = h3 = new k(i10.insertBefore(c3(), t13), t13, void 0, s6 ?? {});
  }
  return h3._$AI(t12), h3;
};

// node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t12 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t12.firstChild, t12;
  }
  update(t12) {
    const r9 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t12), this._$Do = D(r9, this.renderRoot, this.renderOptions);
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

// deps/swc/swc-dist/components/icon/elements/Chevron75Icon.js
var t3 = () => b2`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
      <path
        d="M3.375 9.375c-.16016 0-.32031-.06055-.44238-.18262-.24316-.24414-.24316-.64062 0-.88477l3.30859-3.30762L2.93262 1.69238c-.24316-.24414-.24316-.64062 0-.88477.24414-.24414.64062-.24414.88477 0l3.75 3.75c.24316.24414.24316.64062 0 .88477l-3.75 3.75c-.12207.12207-.28223.18262-.44238.18262Z"
      />
    </svg>
  `;

// deps/swc/swc-dist/components/icon/icon.js
var t4 = i`:host{--swc-icon-inline-size: var(--swc-workflow-icon-medium);--swc-icon-block-size: var(--swc-workflow-icon-medium);display:inline-flex;inline-size:var(--swc-icon-inline-size);block-size:var(--swc-icon-block-size);color:var(--swc-icon-color, currentColor)}:host([size=\"xs\"]){--swc-icon-inline-size: var(--swc-workflow-icon-extra-small);--swc-icon-block-size: var(--swc-workflow-icon-extra-small)}:host([size=\"s\"]){--swc-icon-inline-size: var(--swc-workflow-icon-small);--swc-icon-block-size: var(--swc-workflow-icon-small)}:host([size=\"m\"]){--swc-icon-inline-size: var(--swc-workflow-icon-medium);--swc-icon-block-size: var(--swc-workflow-icon-medium)}:host([size=\"l\"]){--swc-icon-inline-size: var(--swc-workflow-icon-large);--swc-icon-block-size: var(--swc-workflow-icon-large)}:host([size=\"xl\"]){--swc-icon-inline-size: var(--swc-workflow-icon-extra-large);--swc-icon-block-size: var(--swc-workflow-icon-extra-large)}.swc-Icon{display:block;inline-size:100%;block-size:100%}svg,.swc-Icon>svg,::slotted(*){display:block;inline-size:100%;block-size:100%;fill:currentcolor}`;

// deps/swc/swc-dist/core/components/icon/Icon.types.js
var e5 = [
  "xs",
  "s",
  "m",
  "l",
  "xl"
];

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e6(e21, t12, n10, r9) {
  var i10 = arguments.length, a6 = i10 < 3 ? t12 : r9 === null ? r9 = Object.getOwnPropertyDescriptor(t12, n10) : r9, o13;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a6 = Reflect.decorate(e21, t12, n10, r9);
  else for (var s6 = e21.length - 1; s6 >= 0; s6--) (o13 = e21[s6]) && (a6 = (i10 < 3 ? o13(a6) : i10 > 3 ? o13(t12, n10, a6) : o13(t12, n10)) || a6);
  return i10 > 3 && a6 && Object.defineProperty(t12, n10, a6), a6;
}

// node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t12 = o5, e21, r9) => {
  const { kind: n10, metadata: i10 } = r9;
  let s6 = globalThis.litPropertyMetadata.get(i10);
  if (void 0 === s6 && globalThis.litPropertyMetadata.set(i10, s6 = /* @__PURE__ */ new Map()), "setter" === n10 && ((t12 = Object.create(t12)).wrapped = true), s6.set(r9.name, t12), "accessor" === n10) {
    const { name: o13 } = r9;
    return { set(r10) {
      const n11 = e21.get.call(this);
      e21.set.call(this, r10), this.requestUpdate(o13, n11, t12, true, r10);
    }, init(e22) {
      return void 0 !== e22 && this.C(o13, void 0, t12, e22), e22;
    } };
  }
  if ("setter" === n10) {
    const { name: o13 } = r9;
    return function(r10) {
      const n11 = this[o13];
      e21.call(this, r10), this.requestUpdate(o13, n11, t12, true, r10);
    };
  }
  throw Error("Unsupported decorator location: " + n10);
};
function n4(t12) {
  return (e21, o13) => "object" == typeof o13 ? r4(t12, e21, o13) : ((t13, e22, o14) => {
    const r9 = e22.hasOwnProperty(o14);
    return e22.constructor.createProperty(o14, t13), r9 ? Object.getOwnPropertyDescriptor(e22, o14) : void 0;
  })(t12, e21, o13);
}

// node_modules/@lit/reactive-element/decorators/state.js
function r5(r9) {
  return n4({ ...r9, state: true, attribute: false });
}

// node_modules/@lit/reactive-element/decorators/base.js
var e7 = (e21, t12, c5) => (c5.configurable = true, c5.enumerable = true, Reflect.decorate && "object" != typeof t12 && Object.defineProperty(e21, t12, c5), c5);

// node_modules/@lit/reactive-element/decorators/query-assigned-elements.js
function o6(o13) {
  return (e21, n10) => {
    const { slot: r9, selector: s6 } = o13 ?? {}, c5 = "slot" + (r9 ? `[name=${r9}]` : ":not([name])");
    return e7(e21, n10, { get() {
      const t12 = this.renderRoot?.querySelector(c5), e22 = t12?.assignedElements(o13) ?? [];
      return void 0 === s6 ? e22 : e22.filter((t13) => t13.matches(s6));
    } });
  };
}

// deps/swc/swc-dist/core/element/define-element.js
function e8(e21, t12) {
  window.__swc && window.__swc.DEBUG && customElements.get(e21) && window.__swc.warn(void 0, `Attempted to redefine <${e21}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e21, t12);
}

// deps/swc/swc-dist/core/element/version.js
var e9 = "0.1.0";
var t5 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e10(e21 = document) {
  var t12;
  let n10 = e21.activeElement;
  for (; !(n10 == null || (t12 = n10.shadowRoot) == null) && t12.activeElement; ) n10 = n10.shadowRoot.activeElement;
  return n10;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i5;
function a3(t12) {
  class n10 extends t12 {
    hasVisibleFocusInTree() {
      var t13;
      let n11 = e10(this.getRootNode());
      return (t13 = n11 == null ? void 0 : n11.matches(":focus-visible")) == null ? false : t13;
    }
  }
  return n10;
}
var o7 = class extends a3(i4) {
  get dir() {
    var e21;
    return (e21 = getComputedStyle(this).direction) == null ? "ltr" : e21;
  }
};
if (i5 = o7, i5.VERSION = e9, i5.CORE_VERSION = t5, true) {
  let e21 = {
    default: false,
    accessibility: false,
    api: false
  }, t12 = {
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
      ...e21,
      ...((c5 = window.__swc) == null ? void 0 : c5.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t12,
      ...((l4 = window.__swc) == null ? void 0 : l4.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e22, t13, n10, { type: r9 = "api", level: i10 = "default", issues: a6 } = {}) => {
      let { localName: o13 = "base" } = e22 || {}, s7 = `${o13}:${r9}:${i10}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s7) || window.__swc.ignoreWarningLocalNames[o13] || window.__swc.ignoreWarningTypes[r9] || window.__swc.ignoreWarningLevels[i10]) return;
      window.__swc.issuedWarnings.add(s7);
      let c6 = "";
      a6 && a6.length && (a6.unshift(""), c6 = a6.join("\n    - ") + "\n");
      let l5 = i10 === "deprecation" ? "DEPRECATION NOTICE: " : "", u5 = e22 ? "\nInspect this issue in the follow element:" : "", d4 = (e22 ? "\n\n" : "\n") + n10 + "\n", f3 = [];
      f3.push(l5 + t13 + "\n" + c6 + u5), e22 && f3.push(e22), f3.push(d4, { data: {
        localName: o13,
        type: r9,
        level: i10
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s6;
var c5;
var l4;

// deps/swc/swc-dist/core/controllers/language-resolution.js
var e11 = /* @__PURE__ */ Symbol("language resolver updated");
var t6 = /* @__PURE__ */ new Set();
var n5;
function r6(e21) {
  return t6.add(e21), n5 || (n5 = new MutationObserver(() => {
    for (let e22 of t6) e22();
  }), n5.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"]
  })), () => {
    t6.delete(e21), t6.size === 0 && (n5 == null || n5.disconnect(), n5 = void 0);
  };
}
var i6 = class {
  constructor(e21) {
    this.language = this.getDocumentLanguage(), this.host = e21, this.host.addController(this);
  }
  getDocumentLanguage() {
    let e21 = document.documentElement.lang || navigator.language || "en-US";
    try {
      return Intl.DateTimeFormat.supportedLocalesOf([e21]), e21;
    } catch (e22) {
      return "en-US";
    }
  }
  hostConnected() {
    this.resolveLanguage(), this.removeLangListener = r6(this.handleLangChange.bind(this));
  }
  hostDisconnected() {
    var e21, t12;
    (e21 = this.unsubscribe) == null || e21.call(this), this.unsubscribe = void 0, (t12 = this.removeLangListener) == null || t12.call(this), this.removeLangListener = void 0;
  }
  handleLangChange() {
    if (this.unsubscribe) return;
    let t12 = this.getDocumentLanguage();
    if (t12 === this.language) return;
    let n10 = this.language;
    this.language = t12, this.host.requestUpdate(e11, n10);
  }
  resolveLanguage() {
    this.language = this.getDocumentLanguage();
    let t12 = new CustomEvent("sp-language-context", {
      bubbles: true,
      composed: true,
      detail: { callback: (t13, n10) => {
        let r9 = this.language;
        this.language = t13, this.unsubscribe = n10, this.host.requestUpdate(e11, r9);
      } },
      cancelable: true
    });
    this.host.dispatchEvent(t12);
  }
};

// deps/swc/swc-dist/core/mixins/sized-mixin.js
var r7 = [
  "s",
  "m",
  "l",
  "xl"
];
function i7(n10, { validSizes: i10 = [...r7], noDefaultSize: a6, defaultSize: o13 = "m" } = {}) {
  var s6;
  class c5 extends n10 {
    constructor(...e21) {
      super(...e21), this._size = o13;
    }
    get size() {
      return this._size || o13;
    }
    set size(e21) {
      let t12 = a6 ? null : o13, n11 = e21 && e21.toLocaleLowerCase(), r9 = this.constructor.VALID_SIZES.includes(n11) ? n11 : t12;
      if (r9 && this.setAttribute("size", r9), this._size === r9) return;
      let i11 = this._size;
      this._size = r9, this.requestUpdate("size", i11);
    }
    update(e21) {
      !this.hasAttribute("size") && !a6 && this.setAttribute("size", this.size), super.update(e21);
    }
  }
  return s6 = c5, s6.VALID_SIZES = i10, e6([n4({ type: String })], c5.prototype, "size", null), c5;
}

// deps/swc/swc-dist/core/components/icon/Icon.base.js
var o11 = class extends i7(o7, { validSizes: [...e5] }) {
  constructor(...e21) {
    super(...e21), this.label = "";
  }
  firstUpdated(e21) {
    super.firstUpdated(e21), this.updateSlottedIcon(), this.updateHostAccessibility();
  }
  updated(e21) {
    super.updated(e21), e21.has("label") && (this.updateSlottedIcon(), this.updateHostAccessibility());
  }
  handleSlotChange() {
    this.updateSlottedIcon();
  }
  updateSlottedIcon() {
    var e21;
    let [t12] = this.defaultSlotElements;
    if (!t12) return;
    let n10 = t12 instanceof SVGElement ? t12 : (e21 = t12.querySelector) == null ? void 0 : e21.call(t12, "svg");
    n10 && (n10.setAttribute("role", "img"), this.label ? (n10.setAttribute("aria-label", this.label), n10.removeAttribute("aria-hidden")) : (n10.setAttribute("aria-hidden", "true"), n10.removeAttribute("aria-label")));
  }
  updateHostAccessibility() {
    this.label ? this.removeAttribute("aria-hidden") : this.setAttribute("aria-hidden", "true");
  }
};
e6([n4({ type: String })], o11.prototype, "label", void 0), e6([o6({ flatten: true })], o11.prototype, "defaultSlotElements", void 0);

// deps/swc/swc-dist/components/icon/Icon2.js
var r8 = class extends o11 {
  static get styles() {
    return [t4];
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
e8("swc-icon", r8);

// deps/swc/swc-dist/components/progress-circle/progress-circle.js
var t7 = i`@keyframes swc-fills-rotate{0%{transform:rotate(-90deg)}to{transform:rotate(270deg)}}@keyframes swc-dashoffset-animation{0%,to{stroke-dashoffset:75px}30%{stroke-dashoffset:20px}}:host{display:inline-block;align-self:center;justify-self:center;place-self:center}*{box-sizing:border-box}.swc-ProgressCircle{--_swc-progress-circle-size: var(--swc-progress-circle-size, var(--swc-progress-circle-size-medium));--_swc-progress-circle-track-border-color: var(--swc-progress-circle-track-border-color, var(--swc-gray-300));--_swc-progress-circle-fill-border-color: var(--swc-progress-circle-fill-border-color, var(--swc-accent-color-900));--_swc-progress-circle-thickness: var(--swc-progress-circle-thickness, var(--swc-progress-circle-thickness-medium));display:inline-block;position:relative;inline-size:var(--_swc-progress-circle-size);block-size:var(--_swc-progress-circle-size);direction:ltr;transform:translateZ(0)}.swc-ProgressCircle-fill,.swc-ProgressCircle-track{inline-size:var(--_swc-progress-circle-size);block-size:var(--_swc-progress-circle-size)}.swc-ProgressCircle-track{stroke:var(--_swc-progress-circle-track-border-color);stroke-width:var(--_swc-progress-circle-thickness)}.swc-ProgressCircle-fill{stroke:var(--_swc-progress-circle-fill-border-color);stroke-width:var(--_swc-progress-circle-thickness);transform:rotate(-90deg);transform-origin:center}.swc-ProgressCircle--indeterminate .swc-ProgressCircle-fill{transform-origin:center;animation:swc-fills-rotate 1s cubic-bezier(.6,.1,.3,.9) infinite,swc-dashoffset-animation 1s cubic-bezier(.25,.1,.25,1.3) infinite;will-change:transform}:host([size=\"s\"]){--swc-progress-circle-size: var(--swc-progress-circle-size-small);--swc-progress-circle-thickness: var(--swc-progress-circle-thickness-small)}:host([size=\"l\"]){--swc-progress-circle-size: var(--swc-progress-circle-size-large);--swc-progress-circle-thickness: var(--swc-progress-circle-thickness-large)}.swc-ProgressCircle:where(.swc-ProgressCircle--staticWhite){--swc-progress-circle-track-border-color: var(--swc-transparent-white-300);--swc-progress-circle-fill-border-color: var(--swc-transparent-white-900)}.swc-ProgressCircle:where(.swc-ProgressCircle--staticBlack){--swc-progress-circle-track-border-color: var(--swc-transparent-black-300);--swc-progress-circle-fill-border-color: var(--swc-transparent-black-900)}@media(prefers-reduced-motion:reduce){.swc-ProgressCircle--indeterminate .swc-ProgressCircle-fill{stroke-dashoffset:75px;animation:none}}@media(forced-colors:active){.swc-ProgressCircle{--swc-progress-circle-fill-border-color: Highlight;@media(prefers-color-scheme:dark){--swc-progress-circle-track-border-color: var(--swc-transparent-white-300)}@media(prefers-color-scheme:light){--swc-progress-circle-track-border-color: var(--swc-transparent-black-300)}}}`;

// node_modules/lit-html/directives/if-defined.js
var o12 = (o13) => o13 ?? A;

// node_modules/lit-html/directive.js
var t8 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e13 = (t12) => (...e21) => ({ _$litDirective$: t12, values: e21 });
var i9 = class {
  constructor(t12) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t12, e21, i10) {
    this._$Ct = t12, this._$AM = e21, this._$Ci = i10;
  }
  _$AS(t12, e21) {
    return this.update(t12, e21);
  }
  update(t12, e21) {
    return this.render(...e21);
  }
};

// node_modules/lit-html/directives/class-map.js
var e14 = e13(class extends i9 {
  constructor(t12) {
    if (super(t12), t12.type !== t8.ATTRIBUTE || "class" !== t12.name || t12.strings?.length > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
  }
  render(t12) {
    return " " + Object.keys(t12).filter((s6) => t12[s6]).join(" ") + " ";
  }
  update(s6, [i10]) {
    if (void 0 === this.st) {
      this.st = /* @__PURE__ */ new Set(), void 0 !== s6.strings && (this.nt = new Set(s6.strings.join(" ").split(/\s/).filter((t12) => "" !== t12)));
      for (const t12 in i10) i10[t12] && !this.nt?.has(t12) && this.st.add(t12);
      return this.render(i10);
    }
    const r9 = s6.element.classList;
    for (const t12 of this.st) t12 in i10 || (r9.remove(t12), this.st.delete(t12));
    for (const t12 in i10) {
      const s7 = !!i10[t12];
      s7 === this.st.has(t12) || this.nt?.has(t12) || (s7 ? (r9.add(t12), this.st.add(t12)) : (r9.remove(t12), this.st.delete(t12)));
    }
    return E;
  }
});

// deps/swc/swc-dist/core/components/progress-circle/ProgressCircle.types.js
var e15 = [
  "s",
  "m",
  "l"
];
var t9 = ["white", "black"];

// deps/swc/swc-dist/core/components/progress-circle/ProgressCircle.base.js
var s5;
var c4 = class e16 extends i7(o7, { validSizes: e15 }) {
  constructor(...e21) {
    super(...e21), this.label = "", this.progress = null, this.languageResolver = new i6(this);
  }
  static hasMeaningfulLightDomChildren(e21) {
    for (let n10 of e21.childNodes) {
      var t12;
      if (n10.nodeType === Node.ELEMENT_NODE || n10.nodeType === Node.TEXT_NODE && (t12 = n10.textContent) != null && t12.trim()) return true;
    }
    return false;
  }
  hasAccessibleName() {
    return !!(this.label || this.getAttribute("aria-label") || this.getAttribute("aria-labelledby"));
  }
  static clampProgress(e21) {
    return Number.isFinite(e21) ? Math.min(100, Math.max(0, e21)) : 0;
  }
  formatProgress() {
    var e21;
    return new Intl.NumberFormat(this.languageResolver.language, {
      style: "percent",
      unitDisplay: "narrow"
    }).format(((e21 = this.progress) == null ? 0 : e21) / 100);
  }
  warnDeprecatedLightDomChildren() {
    var t12;
    (t12 = window.__swc) != null && t12.DEBUG && e16.hasMeaningfulLightDomChildren(this) && window.__swc.warn(this, `<${this.localName}> no longer has a default slot. Light DOM children are not rendered and are not used for an accessible name. Use the "label" attribute or property, or "aria-label" / "aria-labelledby" on the host instead.`, "https://opensource.adobe.com/spectrum-web-components/second-gen/?path=/docs/components-progress-circle--docs", { level: "deprecation" });
  }
  warnMissingAccessibleName() {
    var t12, n10;
    (t12 = window.__swc) != null && t12.DEBUG && ((n10 = window.__swc) == null || n10.warn(this, `<${this.localName}> requires an accessible name. A default label of "${e16.DEFAULT_LABEL}" has been applied, but a more specific label should be provided via:`, "https://opensource.adobe.com/spectrum-web-components/second-gen/?path=/docs/components-progress-circle--docs", {
      type: "accessibility",
      issues: [
        'value supplied to the "label" attribute, which will be displayed visually as part of the element, or',
        'value supplied to the "aria-label" attribute, which will only be provided to screen readers, or',
        'an element ID reference supplied to the "aria-labelledby" attribute, which will be provided by screen readers and will need to be managed manually by the parent application.'
      ]
    }));
  }
  willUpdate(t12) {
    if (t12.has("progress") && this.progress !== null) {
      let t13 = e16.clampProgress(this.progress);
      t13 !== this.progress && (this.progress = t13);
    }
    super.willUpdate(t12);
  }
  firstUpdated(e21) {
    super.firstUpdated(e21), this.setAttribute("role", "progressbar");
  }
  updated(t12) {
    var n10;
    super.updated(t12), t12.has("progress") && (this.progress !== null && this.progress >= 0 ? (this.setAttribute("aria-valuemin", "0"), this.setAttribute("aria-valuemax", "100"), this.setAttribute("aria-valuenow", String(this.progress)), this.setAttribute("aria-valuetext", this.formatProgress())) : (this.removeAttribute("aria-valuemin"), this.removeAttribute("aria-valuemax"), this.removeAttribute("aria-valuenow"), this.removeAttribute("aria-valuetext"))), this.progress !== null && t12.has(e11) && this.setAttribute("aria-valuetext", this.formatProgress()), t12.has("label") && (this.label.length ? this.setAttribute("aria-label", this.label) : t12.get("label") === this.getAttribute("aria-label") && this.removeAttribute("aria-label")), t12.has("label") && !this.hasAccessibleName() && (this.setAttribute("aria-label", e16.DEFAULT_LABEL), this.warnMissingAccessibleName()), (n10 = window.__swc) != null && n10.DEBUG && this.warnDeprecatedLightDomChildren();
  }
};
s5 = c4, s5.DEFAULT_LABEL = "Loading", e6([n4({
  type: String,
  reflect: true,
  attribute: "static-color"
})], c4.prototype, "staticColor", void 0), e6([n4({ type: String })], c4.prototype, "label", void 0), e6([n4({
  type: Number,
  reflect: true
})], c4.prototype, "progress", void 0);

// deps/swc/swc-dist/core/utils/capitalize.js
function e17(e21) {
  return typeof e21 == "string" ? e21.charAt(0).toUpperCase() + e21.slice(1) : "";
}

// deps/swc/swc-dist/core/utils/focusable-selectors.js
var e18 = [
  "input:not([inert]):not([disabled])",
  "select:not([inert]):not([disabled])",
  "textarea:not([inert]):not([disabled])",
  "a[href]:not([inert])",
  "button:not([inert]):not([disabled])",
  "[tabindex]:not([inert])",
  "audio[controls]:not([inert])",
  "video[controls]:not([inert])",
  '[contenteditable]:not([contenteditable="false"]):not([inert])',
  "details>summary:first-of-type:not([inert])",
  "details:not([inert])"
].join(",");
var t10 = e18.split(",").map((e21) => e21 + ':not([tabindex="-1"])').join(",");

// deps/swc/swc-dist/components/progress-circle/ProgressCircle.js
var l3;
var u3 = class extends c4 {
  static get styles() {
    return [t7];
  }
  computeDashOffset() {
    if (this.progress !== null) return this.progress === 0 ? 98 : 100 - this.progress;
  }
  render() {
    let e21 = this.size === "s" ? 2 : this.size === "l" ? 6 : 4, t12 = `calc(50% - ${e21 / 2}px)`;
    return b2`
      <div
        class=${e14({
      "swc-ProgressCircle": true,
      "swc-ProgressCircle--indeterminate": this.progress === null,
      [`swc-ProgressCircle--static${e17(this.staticColor)}`]: this.staticColor !== void 0
    })}
      >
        <svg aria-hidden="true" fill="none" width="100%" height="100%">
          <circle
            cx="50%"
            cy="50%"
            r=${`calc(50% - ${e21}px)`}
            stroke-width=${e21}
          />
          <circle
            cx="50%"
            cy="50%"
            class="swc-ProgressCircle-track"
            r=${t12}
          />
          <circle
            cx="50%"
            cy="50%"
            r=${t12}
            class="swc-ProgressCircle-fill"
            pathLength="100"
            stroke-dasharray="100 200"
            stroke-dashoffset=${o12(this.computeDashOffset())}
            stroke-linecap="round"
          />
        </svg>
      </div>
    `;
  }
};
l3 = u3, l3.STATIC_COLORS = t9, e([n4({
  reflect: true,
  attribute: "static-color"
})], u3.prototype, "staticColor", void 0);

// deps/swc/swc-dist/components/progress-circle/swc-progress-circle.js
e8("swc-progress-circle", u3);

// deps/swc/swc-dist/patterns/conversational-ai/utils/icons/index.js
var a5 = () => b2`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
    <path
      fill="currentColor"
      d="M10 18.75C5.1748 18.75 1.25 14.8252 1.25 10C1.25 5.1748 5.1748 1.25 10 1.25C14.8252 1.25 18.75 5.1748 18.75 10C18.75 14.8252 14.8252 18.75 10 18.75ZM10 2.75C6.00195 2.75 2.75 6.00195 2.75 10C2.75 13.998 6.00195 17.25 10 17.25C13.998 17.25 17.25 13.998 17.25 10C17.25 6.00195 13.998 2.75 10 2.75Z"
    />
    <path
      fill="currentColor"
      d="M9.22261 13.5C9.0107 13.5 8.80757 13.4101 8.66499 13.2519L6.15425 10.4599C5.87691 10.1514 5.9023 9.67772 6.20991 9.40038C6.51752 9.12304 6.99116 9.14843 7.26948 9.45604L9.16303 11.5625L12.6503 6.80663C12.8935 6.47265 13.3613 6.39745 13.6982 6.6455C14.0322 6.88964 14.1044 7.35937 13.8593 7.69335L9.82708 13.1933C9.69427 13.376 9.48528 13.4883 9.2597 13.499C9.24798 13.5 9.23531 13.5 9.22261 13.5Z"
    />
  </svg>
`;

// deps/swc/swc-dist/utils/id.js
function e20(e21) {
  return `${e21}-${Array.from(crypto.getRandomValues(new Uint8Array(4)), (e22) => `0${(e22 & 255).toString(16)}`.slice(-2)).join("")}`;
}

// deps/swc/swc-dist/patterns/conversational-ai/response-status/response-status.js
var t11 = i`:host{display:block}*,*:before,*:after{box-sizing:border-box}.swc-ResponseStatus{display:flex;flex-direction:column;gap:8px}.swc-ResponseStatus-row{display:flex;gap:8px;align-items:center;block-size:var(--swc-response-status-row-block-size, 32px)}.swc-ResponseStatus-row--button{inline-size:-moz-fit-content;inline-size:fit-content;padding:var(--swc-sources-toggle-padding, 3px) 8px;background:transparent;border:none;border-radius:8px;transition:background .13s cubic-bezier(.45,0,.4,1)}.swc-ResponseStatus-loadingSlot{display:inline-flex;flex-shrink:0;align-items:center}.swc-ResponseStatus-label{font-family:var(--swc-sans-font-family-stack);font-size:var(--swc-font-size-100);font-weight:400;line-height:var(--swc-line-height-font-size-100);color:var(--swc-gray-700)}.swc-ResponseStatus-row--button:hover .swc-ResponseStatus-label{color:var(--swc-gray-800)}.swc-ResponseStatus-row--button:hover{background:var(--swc-gray-100)}.swc-ResponseStatus-chevron{flex-shrink:0;transition:transform .13s ease}.swc-ResponseStatus-chevron--down{transform:rotate(90deg)}.swc-ResponseStatus-reasoning-panel{interpolate-size:allow-keywords;display:block;visibility:hidden;block-size:0;padding-inline:8px;font-family:var(--swc-sans-font-family-stack);font-size:var(--swc-font-size-100);font-weight:400;line-height:var(--swc-line-height-font-size-100);color:var(--swc-gray-700);overflow:hidden;transition:block-size .16s cubic-bezier(.45,0,.4,1),visibility .16s linear}.swc-ResponseStatus-row--button[aria-expanded=true]+.swc-ResponseStatus-reasoning-panel{visibility:visible;block-size:auto}`;

// deps/swc/swc-dist/patterns/conversational-ai/response-status/ResponseStatus.js
var u4 = class extends o7 {
  constructor(...e21) {
    super(...e21), this.reasoningPanelId = e20("swc-reasoning-panel"), this._hasReasoningContent = false, this.loading = false, this.loadingLabel = "Generating response", this.completeLabel = "Response generated", this.reasoningLabel = "Reasoning", this.open = false;
  }
  static get styles() {
    return [t11];
  }
  firstUpdated() {
    this._syncReasoningContent();
  }
  _handleToggle() {
    this.loading || !this._hasReasoningContent || (this.open = !this.open, this.dispatchEvent(new CustomEvent("swc-response-status-toggle", {
      bubbles: true,
      composed: true,
      detail: { open: this.open }
    })));
  }
  _getStatusLabel() {
    return this.loading ? this.loadingLabel : this.completeLabel;
  }
  _slotHasReasoningContent(e21) {
    if (!e21) return false;
    for (let n10 of e21.assignedNodes({ flatten: true })) {
      var t12;
      if (n10.nodeType === Node.TEXT_NODE && (t12 = n10.textContent) != null && t12.trim() || n10.nodeType === Node.ELEMENT_NODE) return true;
    }
    return false;
  }
  _syncReasoningContent(e21) {
    var t12, n10;
    let r9 = (t12 = e21 == null ? (n10 = this.shadowRoot) == null ? void 0 : n10.querySelector(".swc-ResponseStatus-reasoning-slot") : e21) == null ? null : t12, i10 = this._slotHasReasoningContent(r9);
    !i10 && this.open && (this.open = false), this._hasReasoningContent = i10;
  }
  _handleReasoningSlotChange(e21) {
    this._syncReasoningContent(e21.target);
  }
  _renderLoadingRow(e21) {
    return b2`
      <div class="swc-ResponseStatus-row" role="status" aria-label=${e21}>
        <span class="swc-ResponseStatus-loadingSlot">
          <swc-progress-circle
            size="s"
            indeterminate
            aria-hidden="true"
          ></swc-progress-circle>
        </span>
        <span class="swc-ResponseStatus-label">${e21}</span>
      </div>
    `;
  }
  _renderCompleteRow(e21, r9) {
    let i10 = this.open;
    return r9 ? b2`
        <button
          class="swc-ResponseStatus-row swc-ResponseStatus-row--button"
          aria-label=${e21}
          aria-expanded=${i10}
          aria-controls=${this.reasoningPanelId}
          @click=${this._handleToggle}
        >
          <swc-icon
            class=${i10 ? "swc-ResponseStatus-chevron swc-ResponseStatus-chevron--down" : "swc-ResponseStatus-chevron"}
            style="--swc-icon-inline-size:10px;--swc-icon-block-size:10px;"
            aria-hidden="true"
          >
            ${t3()}
          </swc-icon>
          <span class="swc-ResponseStatus-label">${e21}</span>
          <swc-icon
            style="--swc-icon-inline-size:20px;--swc-icon-block-size:20px;"
            aria-hidden="true"
          >
            ${a5()}
          </swc-icon>
        </button>
      ` : b2`
      <div class="swc-ResponseStatus-row">
        <swc-icon
          style="--swc-icon-inline-size:20px;--swc-icon-block-size:20px;"
          aria-hidden="true"
        >
          ${a5()}
        </swc-icon>
        <span class="swc-ResponseStatus-label">${e21}</span>
      </div>
    `;
  }
  render() {
    let e21 = this.loading, t12 = this._getStatusLabel(), n10 = !e21 && this._hasReasoningContent;
    return b2`
      <div class="swc-ResponseStatus">
        ${e21 ? this._renderLoadingRow(t12) : this._renderCompleteRow(t12, n10)}
        <div
          id=${this.reasoningPanelId}
          class="swc-ResponseStatus-reasoning-panel"
          role=${o12(n10 ? "group" : void 0)}
          aria-label=${o12(n10 ? this.reasoningLabel : void 0)}
          ?hidden=${!n10 || !this.open}
        >
          <slot
            class="swc-ResponseStatus-reasoning-slot"
            @slotchange=${this._handleReasoningSlotChange}
          ></slot>
        </div>
      </div>
    `;
  }
};
e([r5()], u4.prototype, "_hasReasoningContent", void 0), e([n4({
  type: Boolean,
  reflect: true
})], u4.prototype, "loading", void 0), e([n4({
  type: String,
  reflect: true
})], u4.prototype, "loadingLabel", void 0), e([n4({
  type: String,
  reflect: true
})], u4.prototype, "completeLabel", void 0), e([n4({
  type: String,
  attribute: "reasoning-label"
})], u4.prototype, "reasoningLabel", void 0), e([n4({
  type: Boolean,
  reflect: true
})], u4.prototype, "open", void 0);

// deps/swc/swc-dist/patterns/conversational-ai/response-status/index.js
e8("swc-response-status", u4);
export {
  u4 as ResponseStatus
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
@lit-labs/observers/mutation-controller.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directives/if-defined.js:
lit-html/directives/class-map.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
