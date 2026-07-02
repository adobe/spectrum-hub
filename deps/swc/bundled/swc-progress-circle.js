// deps/swc/swc-dist/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e(e19, t9, n10, r7) {
  var i10 = arguments.length, a5 = i10 < 3 ? t9 : r7 === null ? r7 = Object.getOwnPropertyDescriptor(t9, n10) : r7, o11;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e19, t9, n10, r7);
  else for (var s6 = e19.length - 1; s6 >= 0; s6--) (o11 = e19[s6]) && (a5 = (i10 < 3 ? o11(a5) : i10 > 3 ? o11(t9, n10, a5) : o11(t9, n10)) || a5);
  return i10 > 3 && a5 && Object.defineProperty(t9, n10, a5), a5;
}

// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e2 = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t9, e19, o11) {
    if (this._$cssResult$ = true, o11 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t9, this.t = e19;
  }
  get styleSheet() {
    let t9 = this.o;
    const s6 = this.t;
    if (e2 && void 0 === t9) {
      const e19 = void 0 !== s6 && 1 === s6.length;
      e19 && (t9 = o.get(s6)), void 0 === t9 && ((this.o = t9 = new CSSStyleSheet()).replaceSync(this.cssText), e19 && o.set(s6, t9));
    }
    return t9;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t9) => new n("string" == typeof t9 ? t9 : t9 + "", void 0, s);
var i = (t9, ...e19) => {
  const o11 = 1 === t9.length ? t9[0] : e19.reduce((e20, s6, o12) => e20 + ((t10) => {
    if (true === t10._$cssResult$) return t10.cssText;
    if ("number" == typeof t10) return t10;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t10 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s6) + t9[o12 + 1], t9[0]);
  return new n(o11, t9, s);
};
var S = (s6, o11) => {
  if (e2) s6.adoptedStyleSheets = o11.map((t9) => t9 instanceof CSSStyleSheet ? t9 : t9.styleSheet);
  else for (const e19 of o11) {
    const o12 = document.createElement("style"), n10 = t.litNonce;
    void 0 !== n10 && o12.setAttribute("nonce", n10), o12.textContent = e19.cssText, s6.appendChild(o12);
  }
};
var c = e2 ? (t9) => t9 : (t9) => t9 instanceof CSSStyleSheet ? ((t10) => {
  let e19 = "";
  for (const s6 of t10.cssRules) e19 += s6.cssText;
  return r(e19);
})(t9) : t9;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e3, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t9, s6) => t9;
var u = { toAttribute(t9, s6) {
  switch (s6) {
    case Boolean:
      t9 = t9 ? l : null;
      break;
    case Object:
    case Array:
      t9 = null == t9 ? t9 : JSON.stringify(t9);
  }
  return t9;
}, fromAttribute(t9, s6) {
  let i10 = t9;
  switch (s6) {
    case Boolean:
      i10 = null !== t9;
      break;
    case Number:
      i10 = null === t9 ? null : Number(t9);
      break;
    case Object:
    case Array:
      try {
        i10 = JSON.parse(t9);
      } catch (t10) {
        i10 = null;
      }
  }
  return i10;
} };
var f = (t9, s6) => !i2(t9, s6);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t9) {
    this._$Ei(), (this.l ??= []).push(t9);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t9, s6 = b) {
    if (s6.state && (s6.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t9) && ((s6 = Object.create(s6)).wrapped = true), this.elementProperties.set(t9, s6), !s6.noAccessor) {
      const i10 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t9, i10, s6);
      void 0 !== h3 && e3(this.prototype, t9, h3);
    }
  }
  static getPropertyDescriptor(t9, s6, i10) {
    const { get: e19, set: r7 } = h(this.prototype, t9) ?? { get() {
      return this[s6];
    }, set(t10) {
      this[s6] = t10;
    } };
    return { get: e19, set(s7) {
      const h3 = e19?.call(this);
      r7?.call(this, s7), this.requestUpdate(t9, h3, i10);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t9) {
    return this.elementProperties.get(t9) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t9 = n2(this);
    t9.finalize(), void 0 !== t9.l && (this.l = [...t9.l]), this.elementProperties = new Map(t9.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t10 = this.properties, s6 = [...r2(t10), ...o2(t10)];
      for (const i10 of s6) this.createProperty(i10, t10[i10]);
    }
    const t9 = this[Symbol.metadata];
    if (null !== t9) {
      const s6 = litPropertyMetadata.get(t9);
      if (void 0 !== s6) for (const [t10, i10] of s6) this.elementProperties.set(t10, i10);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t10, s6] of this.elementProperties) {
      const i10 = this._$Eu(t10, s6);
      void 0 !== i10 && this._$Eh.set(i10, t10);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s6) {
    const i10 = [];
    if (Array.isArray(s6)) {
      const e19 = new Set(s6.flat(1 / 0).reverse());
      for (const s7 of e19) i10.unshift(c(s7));
    } else void 0 !== s6 && i10.push(c(s6));
    return i10;
  }
  static _$Eu(t9, s6) {
    const i10 = s6.attribute;
    return false === i10 ? void 0 : "string" == typeof i10 ? i10 : "string" == typeof t9 ? t9.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t9) => this.enableUpdating = t9), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t9) => t9(this));
  }
  addController(t9) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t9), void 0 !== this.renderRoot && this.isConnected && t9.hostConnected?.();
  }
  removeController(t9) {
    this._$EO?.delete(t9);
  }
  _$E_() {
    const t9 = /* @__PURE__ */ new Map(), s6 = this.constructor.elementProperties;
    for (const i10 of s6.keys()) this.hasOwnProperty(i10) && (t9.set(i10, this[i10]), delete this[i10]);
    t9.size > 0 && (this._$Ep = t9);
  }
  createRenderRoot() {
    const t9 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t9, this.constructor.elementStyles), t9;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t9) => t9.hostConnected?.());
  }
  enableUpdating(t9) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t9) => t9.hostDisconnected?.());
  }
  attributeChangedCallback(t9, s6, i10) {
    this._$AK(t9, i10);
  }
  _$ET(t9, s6) {
    const i10 = this.constructor.elementProperties.get(t9), e19 = this.constructor._$Eu(t9, i10);
    if (void 0 !== e19 && true === i10.reflect) {
      const h3 = (void 0 !== i10.converter?.toAttribute ? i10.converter : u).toAttribute(s6, i10.type);
      this._$Em = t9, null == h3 ? this.removeAttribute(e19) : this.setAttribute(e19, h3), this._$Em = null;
    }
  }
  _$AK(t9, s6) {
    const i10 = this.constructor, e19 = i10._$Eh.get(t9);
    if (void 0 !== e19 && this._$Em !== e19) {
      const t10 = i10.getPropertyOptions(e19), h3 = "function" == typeof t10.converter ? { fromAttribute: t10.converter } : void 0 !== t10.converter?.fromAttribute ? t10.converter : u;
      this._$Em = e19;
      const r7 = h3.fromAttribute(s6, t10.type);
      this[e19] = r7 ?? this._$Ej?.get(e19) ?? r7, this._$Em = null;
    }
  }
  requestUpdate(t9, s6, i10, e19 = false, h3) {
    if (void 0 !== t9) {
      const r7 = this.constructor;
      if (false === e19 && (h3 = this[t9]), i10 ??= r7.getPropertyOptions(t9), !((i10.hasChanged ?? f)(h3, s6) || i10.useDefault && i10.reflect && h3 === this._$Ej?.get(t9) && !this.hasAttribute(r7._$Eu(t9, i10)))) return;
      this.C(t9, s6, i10);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t9, s6, { useDefault: i10, reflect: e19, wrapped: h3 }, r7) {
    i10 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t9) && (this._$Ej.set(t9, r7 ?? s6 ?? this[t9]), true !== h3 || void 0 !== r7) || (this._$AL.has(t9) || (this.hasUpdated || i10 || (s6 = void 0), this._$AL.set(t9, s6)), true === e19 && this._$Em !== t9 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t9));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t10) {
      Promise.reject(t10);
    }
    const t9 = this.scheduleUpdate();
    return null != t9 && await t9, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t11, s7] of this._$Ep) this[t11] = s7;
        this._$Ep = void 0;
      }
      const t10 = this.constructor.elementProperties;
      if (t10.size > 0) for (const [s7, i10] of t10) {
        const { wrapped: t11 } = i10, e19 = this[s7];
        true !== t11 || this._$AL.has(s7) || void 0 === e19 || this.C(s7, void 0, i10, e19);
      }
    }
    let t9 = false;
    const s6 = this._$AL;
    try {
      t9 = this.shouldUpdate(s6), t9 ? (this.willUpdate(s6), this._$EO?.forEach((t10) => t10.hostUpdate?.()), this.update(s6)) : this._$EM();
    } catch (s7) {
      throw t9 = false, this._$EM(), s7;
    }
    t9 && this._$AE(s6);
  }
  willUpdate(t9) {
  }
  _$AE(t9) {
    this._$EO?.forEach((t10) => t10.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t9)), this.updated(t9);
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
  shouldUpdate(t9) {
    return true;
  }
  update(t9) {
    this._$Eq &&= this._$Eq.forEach((t10) => this._$ET(t10, this[t10])), this._$EM();
  }
  updated(t9) {
  }
  firstUpdated(t9) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t9) => t9;
var s2 = t2.trustedTypes;
var e4 = s2 ? s2.createPolicy("lit-html", { createHTML: (t9) => t9 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t9) => null === t9 || "object" != typeof t9 && "function" != typeof t9;
var u2 = Array.isArray;
var d2 = (t9) => u2(t9) || "function" == typeof t9?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t9) => (i10, ...s6) => ({ _$litType$: t9, strings: i10, values: s6 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t9, i10) {
  if (!u2(t9) || !t9.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e4 ? e4.createHTML(i10) : i10;
}
var N = (t9, i10) => {
  const s6 = t9.length - 1, e19 = [];
  let n10, l4 = 2 === i10 ? "<svg>" : 3 === i10 ? "<math>" : "", c5 = v;
  for (let i11 = 0; i11 < s6; i11++) {
    const s7 = t9[i11];
    let a5, u4, d4 = -1, f3 = 0;
    for (; f3 < s7.length && (c5.lastIndex = f3, u4 = c5.exec(s7), null !== u4); ) f3 = c5.lastIndex, c5 === v ? "!--" === u4[1] ? c5 = _ : void 0 !== u4[1] ? c5 = m : void 0 !== u4[2] ? (y2.test(u4[2]) && (n10 = RegExp("</" + u4[2], "g")), c5 = p2) : void 0 !== u4[3] && (c5 = p2) : c5 === p2 ? ">" === u4[0] ? (c5 = n10 ?? v, d4 = -1) : void 0 === u4[1] ? d4 = -2 : (d4 = c5.lastIndex - u4[2].length, a5 = u4[1], c5 = void 0 === u4[3] ? p2 : '"' === u4[3] ? $ : g) : c5 === $ || c5 === g ? c5 = p2 : c5 === _ || c5 === m ? c5 = v : (c5 = p2, n10 = void 0);
    const x2 = c5 === p2 && t9[i11 + 1].startsWith("/>") ? " " : "";
    l4 += c5 === v ? s7 + r3 : d4 >= 0 ? (e19.push(a5), s7.slice(0, d4) + h2 + s7.slice(d4) + o3 + x2) : s7 + o3 + (-2 === d4 ? i11 : x2);
  }
  return [V(t9, l4 + (t9[s6] || "<?>") + (2 === i10 ? "</svg>" : 3 === i10 ? "</math>" : "")), e19];
};
var S2 = class _S {
  constructor({ strings: t9, _$litType$: i10 }, e19) {
    let r7;
    this.parts = [];
    let l4 = 0, a5 = 0;
    const u4 = t9.length - 1, d4 = this.parts, [f3, v2] = N(t9, i10);
    if (this.el = _S.createElement(f3, e19), P.currentNode = this.el.content, 2 === i10 || 3 === i10) {
      const t10 = this.el.content.firstChild;
      t10.replaceWith(...t10.childNodes);
    }
    for (; null !== (r7 = P.nextNode()) && d4.length < u4; ) {
      if (1 === r7.nodeType) {
        if (r7.hasAttributes()) for (const t10 of r7.getAttributeNames()) if (t10.endsWith(h2)) {
          const i11 = v2[a5++], s6 = r7.getAttribute(t10).split(o3), e20 = /([.?@])?(.*)/.exec(i11);
          d4.push({ type: 1, index: l4, name: e20[2], strings: s6, ctor: "." === e20[1] ? I : "?" === e20[1] ? L : "@" === e20[1] ? z : H }), r7.removeAttribute(t10);
        } else t10.startsWith(o3) && (d4.push({ type: 6, index: l4 }), r7.removeAttribute(t10));
        if (y2.test(r7.tagName)) {
          const t10 = r7.textContent.split(o3), i11 = t10.length - 1;
          if (i11 > 0) {
            r7.textContent = s2 ? s2.emptyScript : "";
            for (let s6 = 0; s6 < i11; s6++) r7.append(t10[s6], c3()), P.nextNode(), d4.push({ type: 2, index: ++l4 });
            r7.append(t10[i11], c3());
          }
        }
      } else if (8 === r7.nodeType) if (r7.data === n3) d4.push({ type: 2, index: l4 });
      else {
        let t10 = -1;
        for (; -1 !== (t10 = r7.data.indexOf(o3, t10 + 1)); ) d4.push({ type: 7, index: l4 }), t10 += o3.length - 1;
      }
      l4++;
    }
  }
  static createElement(t9, i10) {
    const s6 = l2.createElement("template");
    return s6.innerHTML = t9, s6;
  }
};
function M(t9, i10, s6 = t9, e19) {
  if (i10 === E) return i10;
  let h3 = void 0 !== e19 ? s6._$Co?.[e19] : s6._$Cl;
  const o11 = a2(i10) ? void 0 : i10._$litDirective$;
  return h3?.constructor !== o11 && (h3?._$AO?.(false), void 0 === o11 ? h3 = void 0 : (h3 = new o11(t9), h3._$AT(t9, s6, e19)), void 0 !== e19 ? (s6._$Co ??= [])[e19] = h3 : s6._$Cl = h3), void 0 !== h3 && (i10 = M(t9, h3._$AS(t9, i10.values), h3, e19)), i10;
}
var R = class {
  constructor(t9, i10) {
    this._$AV = [], this._$AN = void 0, this._$AD = t9, this._$AM = i10;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t9) {
    const { el: { content: i10 }, parts: s6 } = this._$AD, e19 = (t9?.creationScope ?? l2).importNode(i10, true);
    P.currentNode = e19;
    let h3 = P.nextNode(), o11 = 0, n10 = 0, r7 = s6[0];
    for (; void 0 !== r7; ) {
      if (o11 === r7.index) {
        let i11;
        2 === r7.type ? i11 = new k(h3, h3.nextSibling, this, t9) : 1 === r7.type ? i11 = new r7.ctor(h3, r7.name, r7.strings, this, t9) : 6 === r7.type && (i11 = new Z(h3, this, t9)), this._$AV.push(i11), r7 = s6[++n10];
      }
      o11 !== r7?.index && (h3 = P.nextNode(), o11++);
    }
    return P.currentNode = l2, e19;
  }
  p(t9) {
    let i10 = 0;
    for (const s6 of this._$AV) void 0 !== s6 && (void 0 !== s6.strings ? (s6._$AI(t9, s6, i10), i10 += s6.strings.length - 2) : s6._$AI(t9[i10])), i10++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t9, i10, s6, e19) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t9, this._$AB = i10, this._$AM = s6, this.options = e19, this._$Cv = e19?.isConnected ?? true;
  }
  get parentNode() {
    let t9 = this._$AA.parentNode;
    const i10 = this._$AM;
    return void 0 !== i10 && 11 === t9?.nodeType && (t9 = i10.parentNode), t9;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t9, i10 = this) {
    t9 = M(this, t9, i10), a2(t9) ? t9 === A || null == t9 || "" === t9 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t9 !== this._$AH && t9 !== E && this._(t9) : void 0 !== t9._$litType$ ? this.$(t9) : void 0 !== t9.nodeType ? this.T(t9) : d2(t9) ? this.k(t9) : this._(t9);
  }
  O(t9) {
    return this._$AA.parentNode.insertBefore(t9, this._$AB);
  }
  T(t9) {
    this._$AH !== t9 && (this._$AR(), this._$AH = this.O(t9));
  }
  _(t9) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t9 : this.T(l2.createTextNode(t9)), this._$AH = t9;
  }
  $(t9) {
    const { values: i10, _$litType$: s6 } = t9, e19 = "number" == typeof s6 ? this._$AC(t9) : (void 0 === s6.el && (s6.el = S2.createElement(V(s6.h, s6.h[0]), this.options)), s6);
    if (this._$AH?._$AD === e19) this._$AH.p(i10);
    else {
      const t10 = new R(e19, this), s7 = t10.u(this.options);
      t10.p(i10), this.T(s7), this._$AH = t10;
    }
  }
  _$AC(t9) {
    let i10 = C.get(t9.strings);
    return void 0 === i10 && C.set(t9.strings, i10 = new S2(t9)), i10;
  }
  k(t9) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i10 = this._$AH;
    let s6, e19 = 0;
    for (const h3 of t9) e19 === i10.length ? i10.push(s6 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s6 = i10[e19], s6._$AI(h3), e19++;
    e19 < i10.length && (this._$AR(s6 && s6._$AB.nextSibling, e19), i10.length = e19);
  }
  _$AR(t9 = this._$AA.nextSibling, s6) {
    for (this._$AP?.(false, true, s6); t9 !== this._$AB; ) {
      const s7 = i3(t9).nextSibling;
      i3(t9).remove(), t9 = s7;
    }
  }
  setConnected(t9) {
    void 0 === this._$AM && (this._$Cv = t9, this._$AP?.(t9));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t9, i10, s6, e19, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t9, this.name = i10, this._$AM = e19, this.options = h3, s6.length > 2 || "" !== s6[0] || "" !== s6[1] ? (this._$AH = Array(s6.length - 1).fill(new String()), this.strings = s6) : this._$AH = A;
  }
  _$AI(t9, i10 = this, s6, e19) {
    const h3 = this.strings;
    let o11 = false;
    if (void 0 === h3) t9 = M(this, t9, i10, 0), o11 = !a2(t9) || t9 !== this._$AH && t9 !== E, o11 && (this._$AH = t9);
    else {
      const e20 = t9;
      let n10, r7;
      for (t9 = h3[0], n10 = 0; n10 < h3.length - 1; n10++) r7 = M(this, e20[s6 + n10], i10, n10), r7 === E && (r7 = this._$AH[n10]), o11 ||= !a2(r7) || r7 !== this._$AH[n10], r7 === A ? t9 = A : t9 !== A && (t9 += (r7 ?? "") + h3[n10 + 1]), this._$AH[n10] = r7;
    }
    o11 && !e19 && this.j(t9);
  }
  j(t9) {
    t9 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t9 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t9) {
    this.element[this.name] = t9 === A ? void 0 : t9;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t9) {
    this.element.toggleAttribute(this.name, !!t9 && t9 !== A);
  }
};
var z = class extends H {
  constructor(t9, i10, s6, e19, h3) {
    super(t9, i10, s6, e19, h3), this.type = 5;
  }
  _$AI(t9, i10 = this) {
    if ((t9 = M(this, t9, i10, 0) ?? A) === E) return;
    const s6 = this._$AH, e19 = t9 === A && s6 !== A || t9.capture !== s6.capture || t9.once !== s6.once || t9.passive !== s6.passive, h3 = t9 !== A && (s6 === A || e19);
    e19 && this.element.removeEventListener(this.name, this, s6), h3 && this.element.addEventListener(this.name, this, t9), this._$AH = t9;
  }
  handleEvent(t9) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t9) : this._$AH.handleEvent(t9);
  }
};
var Z = class {
  constructor(t9, i10, s6) {
    this.element = t9, this.type = 6, this._$AN = void 0, this._$AM = i10, this.options = s6;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t9) {
    M(this, t9);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.2");
var D = (t9, i10, s6) => {
  const e19 = s6?.renderBefore ?? i10;
  let h3 = e19._$litPart$;
  if (void 0 === h3) {
    const t10 = s6?.renderBefore ?? null;
    e19._$litPart$ = h3 = new k(i10.insertBefore(c3(), t10), t10, void 0, s6 ?? {});
  }
  return h3._$AI(t9), h3;
};

// node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t9 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t9.firstChild, t9;
  }
  update(t9) {
    const r7 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t9), this._$Do = D(r7, this.renderRoot, this.renderOptions);
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

// deps/swc/swc-dist/components/progress-circle/progress-circle.js
var t3 = i`@keyframes swc-fills-rotate{0%{transform:rotate(-90deg)}to{transform:rotate(270deg)}}@keyframes swc-dashoffset-animation{0%,to{stroke-dashoffset:75px}30%{stroke-dashoffset:20px}}:host{display:inline-block;align-self:center;justify-self:center;place-self:center}*{box-sizing:border-box}.swc-ProgressCircle{--_swc-progress-circle-size: var(--swc-progress-circle-size, var(--swc-progress-circle-size-medium));--_swc-progress-circle-track-border-color: var(--swc-progress-circle-track-border-color, var(--swc-gray-300));--_swc-progress-circle-fill-border-color: var(--swc-progress-circle-fill-border-color, var(--swc-accent-color-900));--_swc-progress-circle-thickness: var(--swc-progress-circle-thickness, var(--swc-progress-circle-thickness-medium));display:inline-block;position:relative;inline-size:var(--_swc-progress-circle-size);block-size:var(--_swc-progress-circle-size);direction:ltr;transform:translateZ(0)}.swc-ProgressCircle-fill,.swc-ProgressCircle-track{inline-size:var(--_swc-progress-circle-size);block-size:var(--_swc-progress-circle-size)}.swc-ProgressCircle-track{stroke:var(--_swc-progress-circle-track-border-color);stroke-width:var(--_swc-progress-circle-thickness)}.swc-ProgressCircle-fill{stroke:var(--_swc-progress-circle-fill-border-color);stroke-width:var(--_swc-progress-circle-thickness);transform:rotate(-90deg);transform-origin:center}.swc-ProgressCircle--indeterminate .swc-ProgressCircle-fill{transform-origin:center;animation:swc-fills-rotate 1s cubic-bezier(.6,.1,.3,.9) infinite,swc-dashoffset-animation 1s cubic-bezier(.25,.1,.25,1.3) infinite;will-change:transform}:host([size=\"s\"]){--swc-progress-circle-size: var(--swc-progress-circle-size-small);--swc-progress-circle-thickness: var(--swc-progress-circle-thickness-small)}:host([size=\"l\"]){--swc-progress-circle-size: var(--swc-progress-circle-size-large);--swc-progress-circle-thickness: var(--swc-progress-circle-thickness-large)}.swc-ProgressCircle:where(.swc-ProgressCircle--staticWhite){--swc-progress-circle-track-border-color: var(--swc-transparent-white-300);--swc-progress-circle-fill-border-color: var(--swc-transparent-white-900)}.swc-ProgressCircle:where(.swc-ProgressCircle--staticBlack){--swc-progress-circle-track-border-color: var(--swc-transparent-black-300);--swc-progress-circle-fill-border-color: var(--swc-transparent-black-900)}@media(prefers-reduced-motion:reduce){.swc-ProgressCircle--indeterminate .swc-ProgressCircle-fill{stroke-dashoffset:75px;animation:none}}@media(forced-colors:active){.swc-ProgressCircle{--swc-progress-circle-fill-border-color: Highlight;@media(prefers-color-scheme:dark){--swc-progress-circle-track-border-color: var(--swc-transparent-white-300)}@media(prefers-color-scheme:light){--swc-progress-circle-track-border-color: var(--swc-transparent-black-300)}}}`;

// node_modules/lit-html/directives/if-defined.js
var o5 = (o11) => o11 ?? A;

// node_modules/@lit/reactive-element/decorators/property.js
var o6 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t9 = o6, e19, r7) => {
  const { kind: n10, metadata: i10 } = r7;
  let s6 = globalThis.litPropertyMetadata.get(i10);
  if (void 0 === s6 && globalThis.litPropertyMetadata.set(i10, s6 = /* @__PURE__ */ new Map()), "setter" === n10 && ((t9 = Object.create(t9)).wrapped = true), s6.set(r7.name, t9), "accessor" === n10) {
    const { name: o11 } = r7;
    return { set(r8) {
      const n11 = e19.get.call(this);
      e19.set.call(this, r8), this.requestUpdate(o11, n11, t9, true, r8);
    }, init(e20) {
      return void 0 !== e20 && this.C(o11, void 0, t9, e20), e20;
    } };
  }
  if ("setter" === n10) {
    const { name: o11 } = r7;
    return function(r8) {
      const n11 = this[o11];
      e19.call(this, r8), this.requestUpdate(o11, n11, t9, true, r8);
    };
  }
  throw Error("Unsupported decorator location: " + n10);
};
function n4(t9) {
  return (e19, o11) => "object" == typeof o11 ? r4(t9, e19, o11) : ((t10, e20, o12) => {
    const r7 = e20.hasOwnProperty(o12);
    return e20.constructor.createProperty(o12, t10), r7 ? Object.getOwnPropertyDescriptor(e20, o12) : void 0;
  })(t9, e19, o11);
}

// node_modules/lit-html/directive.js
var t4 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e6 = (t9) => (...e19) => ({ _$litDirective$: t9, values: e19 });
var i5 = class {
  constructor(t9) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t9, e19, i10) {
    this._$Ct = t9, this._$AM = e19, this._$Ci = i10;
  }
  _$AS(t9, e19) {
    return this.update(t9, e19);
  }
  update(t9, e19) {
    return this.render(...e19);
  }
};

// node_modules/lit-html/directives/class-map.js
var e7 = e6(class extends i5 {
  constructor(t9) {
    if (super(t9), t9.type !== t4.ATTRIBUTE || "class" !== t9.name || t9.strings?.length > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
  }
  render(t9) {
    return " " + Object.keys(t9).filter((s6) => t9[s6]).join(" ") + " ";
  }
  update(s6, [i10]) {
    if (void 0 === this.st) {
      this.st = /* @__PURE__ */ new Set(), void 0 !== s6.strings && (this.nt = new Set(s6.strings.join(" ").split(/\s/).filter((t9) => "" !== t9)));
      for (const t9 in i10) i10[t9] && !this.nt?.has(t9) && this.st.add(t9);
      return this.render(i10);
    }
    const r7 = s6.element.classList;
    for (const t9 of this.st) t9 in i10 || (r7.remove(t9), this.st.delete(t9));
    for (const t9 in i10) {
      const s7 = !!i10[t9];
      s7 === this.st.has(t9) || this.nt?.has(t9) || (s7 ? (r7.add(t9), this.st.add(t9)) : (r7.remove(t9), this.st.delete(t9)));
    }
    return E;
  }
});

// deps/swc/swc-dist/core/components/progress-circle/ProgressCircle.types.js
var e8 = [
  "s",
  "m",
  "l"
];
var t5 = ["white", "black"];

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e9(e19, t9, n10, r7) {
  var i10 = arguments.length, a5 = i10 < 3 ? t9 : r7 === null ? r7 = Object.getOwnPropertyDescriptor(t9, n10) : r7, o11;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e19, t9, n10, r7);
  else for (var s6 = e19.length - 1; s6 >= 0; s6--) (o11 = e19[s6]) && (a5 = (i10 < 3 ? o11(a5) : i10 > 3 ? o11(t9, n10, a5) : o11(t9, n10)) || a5);
  return i10 > 3 && a5 && Object.defineProperty(t9, n10, a5), a5;
}

// deps/swc/swc-dist/core/element/define-element.js
function e10(e19, t9) {
  window.__swc && window.__swc.DEBUG && customElements.get(e19) && window.__swc.warn(void 0, `Attempted to redefine <${e19}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e19, t9);
}

// deps/swc/swc-dist/core/element/version.js
var e11 = "0.1.0";
var t6 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e12(e19 = document) {
  var t9;
  let n10 = e19.activeElement;
  for (; !(n10 == null || (t9 = n10.shadowRoot) == null) && t9.activeElement; ) n10 = n10.shadowRoot.activeElement;
  return n10;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i6;
function a3(t9) {
  class n10 extends t9 {
    hasVisibleFocusInTree() {
      var t10;
      let n11 = e12(this.getRootNode());
      return (t10 = n11 == null ? void 0 : n11.matches(":focus-visible")) == null ? false : t10;
    }
  }
  return n10;
}
var o7 = class extends a3(i4) {
  get dir() {
    var e19;
    return (e19 = getComputedStyle(this).direction) == null ? "ltr" : e19;
  }
};
if (i6 = o7, i6.VERSION = e11, i6.CORE_VERSION = t6, true) {
  let e19 = {
    default: false,
    accessibility: false,
    api: false
  }, t9 = {
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
      ...e19,
      ...((c5 = window.__swc) == null ? void 0 : c5.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t9,
      ...((l4 = window.__swc) == null ? void 0 : l4.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e20, t10, n10, { type: r7 = "api", level: i10 = "default", issues: a5 } = {}) => {
      let { localName: o11 = "base" } = e20 || {}, s7 = `${o11}:${r7}:${i10}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s7) || window.__swc.ignoreWarningLocalNames[o11] || window.__swc.ignoreWarningTypes[r7] || window.__swc.ignoreWarningLevels[i10]) return;
      window.__swc.issuedWarnings.add(s7);
      let c6 = "";
      a5 && a5.length && (a5.unshift(""), c6 = a5.join("\n    - ") + "\n");
      let l5 = i10 === "deprecation" ? "DEPRECATION NOTICE: " : "", u4 = e20 ? "\nInspect this issue in the follow element:" : "", d4 = (e20 ? "\n\n" : "\n") + n10 + "\n", f3 = [];
      f3.push(l5 + t10 + "\n" + c6 + u4), e20 && f3.push(e20), f3.push(d4, { data: {
        localName: o11,
        type: r7,
        level: i10
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s6;
var c5;
var l4;

// deps/swc/swc-dist/core/controllers/language-resolution.js
var e13 = /* @__PURE__ */ Symbol("language resolver updated");
var t7 = /* @__PURE__ */ new Set();
var n5;
function r5(e19) {
  return t7.add(e19), n5 || (n5 = new MutationObserver(() => {
    for (let e20 of t7) e20();
  }), n5.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"]
  })), () => {
    t7.delete(e19), t7.size === 0 && (n5 == null || n5.disconnect(), n5 = void 0);
  };
}
var i7 = class {
  constructor(e19) {
    this.language = this.getDocumentLanguage(), this.host = e19, this.host.addController(this);
  }
  getDocumentLanguage() {
    let e19 = document.documentElement.lang || navigator.language || "en-US";
    try {
      return Intl.DateTimeFormat.supportedLocalesOf([e19]), e19;
    } catch (e20) {
      return "en-US";
    }
  }
  hostConnected() {
    this.resolveLanguage(), this.removeLangListener = r5(this.handleLangChange.bind(this));
  }
  hostDisconnected() {
    var e19, t9;
    (e19 = this.unsubscribe) == null || e19.call(this), this.unsubscribe = void 0, (t9 = this.removeLangListener) == null || t9.call(this), this.removeLangListener = void 0;
  }
  handleLangChange() {
    if (this.unsubscribe) return;
    let t9 = this.getDocumentLanguage();
    if (t9 === this.language) return;
    let n10 = this.language;
    this.language = t9, this.host.requestUpdate(e13, n10);
  }
  resolveLanguage() {
    this.language = this.getDocumentLanguage();
    let t9 = new CustomEvent("sp-language-context", {
      bubbles: true,
      composed: true,
      detail: { callback: (t10, n10) => {
        let r7 = this.language;
        this.language = t10, this.unsubscribe = n10, this.host.requestUpdate(e13, r7);
      } },
      cancelable: true
    });
    this.host.dispatchEvent(t9);
  }
};

// deps/swc/swc-dist/core/mixins/sized-mixin.js
var r6 = [
  "s",
  "m",
  "l",
  "xl"
];
function i8(n10, { validSizes: i10 = [...r6], noDefaultSize: a5, defaultSize: o11 = "m" } = {}) {
  var s6;
  class c5 extends n10 {
    constructor(...e19) {
      super(...e19), this._size = o11;
    }
    get size() {
      return this._size || o11;
    }
    set size(e19) {
      let t9 = a5 ? null : o11, n11 = e19 && e19.toLocaleLowerCase(), r7 = this.constructor.VALID_SIZES.includes(n11) ? n11 : t9;
      if (r7 && this.setAttribute("size", r7), this._size === r7) return;
      let i11 = this._size;
      this._size = r7, this.requestUpdate("size", i11);
    }
    update(e19) {
      !this.hasAttribute("size") && !a5 && this.setAttribute("size", this.size), super.update(e19);
    }
  }
  return s6 = c5, s6.VALID_SIZES = i10, e9([n4({ type: String })], c5.prototype, "size", null), c5;
}

// deps/swc/swc-dist/core/components/progress-circle/ProgressCircle.base.js
var s5;
var c4 = class e15 extends i8(o7, { validSizes: e8 }) {
  constructor(...e19) {
    super(...e19), this.label = "", this.progress = null, this.languageResolver = new i7(this);
  }
  static hasMeaningfulLightDomChildren(e19) {
    for (let n10 of e19.childNodes) {
      var t9;
      if (n10.nodeType === Node.ELEMENT_NODE || n10.nodeType === Node.TEXT_NODE && (t9 = n10.textContent) != null && t9.trim()) return true;
    }
    return false;
  }
  hasAccessibleName() {
    return !!(this.label || this.getAttribute("aria-label") || this.getAttribute("aria-labelledby"));
  }
  static clampProgress(e19) {
    return Number.isFinite(e19) ? Math.min(100, Math.max(0, e19)) : 0;
  }
  formatProgress() {
    var e19;
    return new Intl.NumberFormat(this.languageResolver.language, {
      style: "percent",
      unitDisplay: "narrow"
    }).format(((e19 = this.progress) == null ? 0 : e19) / 100);
  }
  warnDeprecatedLightDomChildren() {
    var t9;
    (t9 = window.__swc) != null && t9.DEBUG && e15.hasMeaningfulLightDomChildren(this) && window.__swc.warn(this, `<${this.localName}> no longer has a default slot. Light DOM children are not rendered and are not used for an accessible name. Use the "label" attribute or property, or "aria-label" / "aria-labelledby" on the host instead.`, "https://opensource.adobe.com/spectrum-web-components/second-gen/?path=/docs/components-progress-circle--docs", { level: "deprecation" });
  }
  warnMissingAccessibleName() {
    var t9, n10;
    (t9 = window.__swc) != null && t9.DEBUG && ((n10 = window.__swc) == null || n10.warn(this, `<${this.localName}> requires an accessible name. A default label of "${e15.DEFAULT_LABEL}" has been applied, but a more specific label should be provided via:`, "https://opensource.adobe.com/spectrum-web-components/second-gen/?path=/docs/components-progress-circle--docs", {
      type: "accessibility",
      issues: [
        'value supplied to the "label" attribute, which will be displayed visually as part of the element, or',
        'value supplied to the "aria-label" attribute, which will only be provided to screen readers, or',
        'an element ID reference supplied to the "aria-labelledby" attribute, which will be provided by screen readers and will need to be managed manually by the parent application.'
      ]
    }));
  }
  willUpdate(t9) {
    if (t9.has("progress") && this.progress !== null) {
      let t10 = e15.clampProgress(this.progress);
      t10 !== this.progress && (this.progress = t10);
    }
    super.willUpdate(t9);
  }
  firstUpdated(e19) {
    super.firstUpdated(e19), this.setAttribute("role", "progressbar");
  }
  updated(t9) {
    var n10;
    super.updated(t9), t9.has("progress") && (this.progress !== null && this.progress >= 0 ? (this.setAttribute("aria-valuemin", "0"), this.setAttribute("aria-valuemax", "100"), this.setAttribute("aria-valuenow", String(this.progress)), this.setAttribute("aria-valuetext", this.formatProgress())) : (this.removeAttribute("aria-valuemin"), this.removeAttribute("aria-valuemax"), this.removeAttribute("aria-valuenow"), this.removeAttribute("aria-valuetext"))), this.progress !== null && t9.has(e13) && this.setAttribute("aria-valuetext", this.formatProgress()), t9.has("label") && (this.label.length ? this.setAttribute("aria-label", this.label) : t9.get("label") === this.getAttribute("aria-label") && this.removeAttribute("aria-label")), t9.has("label") && !this.hasAccessibleName() && (this.setAttribute("aria-label", e15.DEFAULT_LABEL), this.warnMissingAccessibleName()), (n10 = window.__swc) != null && n10.DEBUG && this.warnDeprecatedLightDomChildren();
  }
};
s5 = c4, s5.DEFAULT_LABEL = "Loading", e9([n4({
  type: String,
  reflect: true,
  attribute: "static-color"
})], c4.prototype, "staticColor", void 0), e9([n4({ type: String })], c4.prototype, "label", void 0), e9([n4({
  type: Number,
  reflect: true
})], c4.prototype, "progress", void 0);

// deps/swc/swc-dist/core/utils/capitalize.js
function e16(e19) {
  return typeof e19 == "string" ? e19.charAt(0).toUpperCase() + e19.slice(1) : "";
}

// deps/swc/swc-dist/core/utils/focusable-selectors.js
var e17 = [
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
var t8 = e17.split(",").map((e19) => e19 + ':not([tabindex="-1"])').join(",");

// deps/swc/swc-dist/components/progress-circle/ProgressCircle.js
var l3;
var u3 = class extends c4 {
  static get styles() {
    return [t3];
  }
  computeDashOffset() {
    if (this.progress !== null) return this.progress === 0 ? 98 : 100 - this.progress;
  }
  render() {
    let e19 = this.size === "s" ? 2 : this.size === "l" ? 6 : 4, t9 = `calc(50% - ${e19 / 2}px)`;
    return b2`
      <div
        class=${e7({
      "swc-ProgressCircle": true,
      "swc-ProgressCircle--indeterminate": this.progress === null,
      [`swc-ProgressCircle--static${e16(this.staticColor)}`]: this.staticColor !== void 0
    })}
      >
        <svg aria-hidden="true" fill="none" width="100%" height="100%">
          <circle
            cx="50%"
            cy="50%"
            r=${`calc(50% - ${e19}px)`}
            stroke-width=${e19}
          />
          <circle
            cx="50%"
            cy="50%"
            class="swc-ProgressCircle-track"
            r=${t9}
          />
          <circle
            cx="50%"
            cy="50%"
            r=${t9}
            class="swc-ProgressCircle-fill"
            pathLength="100"
            stroke-dasharray="100 200"
            stroke-dashoffset=${o5(this.computeDashOffset())}
            stroke-linecap="round"
          />
        </svg>
      </div>
    `;
  }
};
l3 = u3, l3.STATIC_COLORS = t5, e([n4({
  reflect: true,
  attribute: "static-color"
})], u3.prototype, "staticColor", void 0);

// deps/swc/swc-dist/components/progress-circle/swc-progress-circle.js
e10("swc-progress-circle", u3);
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

lit-html/directives/if-defined.js:
lit-html/directives/class-map.js:
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
