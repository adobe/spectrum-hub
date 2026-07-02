// deps/swc/swc-dist/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e(e14, t8, n10, r9) {
  var i12 = arguments.length, a5 = i12 < 3 ? t8 : r9 === null ? r9 = Object.getOwnPropertyDescriptor(t8, n10) : r9, o14;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e14, t8, n10, r9);
  else for (var s5 = e14.length - 1; s5 >= 0; s5--) (o14 = e14[s5]) && (a5 = (i12 < 3 ? o14(a5) : i12 > 3 ? o14(t8, n10, a5) : o14(t8, n10)) || a5);
  return i12 > 3 && a5 && Object.defineProperty(t8, n10, a5), a5;
}

// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e2 = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t8, e14, o14) {
    if (this._$cssResult$ = true, o14 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
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
  const o14 = 1 === t8.length ? t8[0] : e14.reduce((e15, s5, o15) => e15 + ((t9) => {
    if (true === t9._$cssResult$) return t9.cssText;
    if ("number" == typeof t9) return t9;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t9 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t8[o15 + 1], t8[0]);
  return new n(o14, t8, s);
};
var S = (s5, o14) => {
  if (e2) s5.adoptedStyleSheets = o14.map((t8) => t8 instanceof CSSStyleSheet ? t8 : t8.styleSheet);
  else for (const e14 of o14) {
    const o15 = document.createElement("style"), n10 = t.litNonce;
    void 0 !== n10 && o15.setAttribute("nonce", n10), o15.textContent = e14.cssText, s5.appendChild(o15);
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
  let i12 = t8;
  switch (s5) {
    case Boolean:
      i12 = null !== t8;
      break;
    case Number:
      i12 = null === t8 ? null : Number(t8);
      break;
    case Object:
    case Array:
      try {
        i12 = JSON.parse(t8);
      } catch (t9) {
        i12 = null;
      }
  }
  return i12;
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
      const i12 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t8, i12, s5);
      void 0 !== h3 && e3(this.prototype, t8, h3);
    }
  }
  static getPropertyDescriptor(t8, s5, i12) {
    const { get: e14, set: r9 } = h(this.prototype, t8) ?? { get() {
      return this[s5];
    }, set(t9) {
      this[s5] = t9;
    } };
    return { get: e14, set(s6) {
      const h3 = e14?.call(this);
      r9?.call(this, s6), this.requestUpdate(t8, h3, i12);
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
      for (const i12 of s5) this.createProperty(i12, t9[i12]);
    }
    const t8 = this[Symbol.metadata];
    if (null !== t8) {
      const s5 = litPropertyMetadata.get(t8);
      if (void 0 !== s5) for (const [t9, i12] of s5) this.elementProperties.set(t9, i12);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t9, s5] of this.elementProperties) {
      const i12 = this._$Eu(t9, s5);
      void 0 !== i12 && this._$Eh.set(i12, t9);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s5) {
    const i12 = [];
    if (Array.isArray(s5)) {
      const e14 = new Set(s5.flat(1 / 0).reverse());
      for (const s6 of e14) i12.unshift(c(s6));
    } else void 0 !== s5 && i12.push(c(s5));
    return i12;
  }
  static _$Eu(t8, s5) {
    const i12 = s5.attribute;
    return false === i12 ? void 0 : "string" == typeof i12 ? i12 : "string" == typeof t8 ? t8.toLowerCase() : void 0;
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
    for (const i12 of s5.keys()) this.hasOwnProperty(i12) && (t8.set(i12, this[i12]), delete this[i12]);
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
  attributeChangedCallback(t8, s5, i12) {
    this._$AK(t8, i12);
  }
  _$ET(t8, s5) {
    const i12 = this.constructor.elementProperties.get(t8), e14 = this.constructor._$Eu(t8, i12);
    if (void 0 !== e14 && true === i12.reflect) {
      const h3 = (void 0 !== i12.converter?.toAttribute ? i12.converter : u).toAttribute(s5, i12.type);
      this._$Em = t8, null == h3 ? this.removeAttribute(e14) : this.setAttribute(e14, h3), this._$Em = null;
    }
  }
  _$AK(t8, s5) {
    const i12 = this.constructor, e14 = i12._$Eh.get(t8);
    if (void 0 !== e14 && this._$Em !== e14) {
      const t9 = i12.getPropertyOptions(e14), h3 = "function" == typeof t9.converter ? { fromAttribute: t9.converter } : void 0 !== t9.converter?.fromAttribute ? t9.converter : u;
      this._$Em = e14;
      const r9 = h3.fromAttribute(s5, t9.type);
      this[e14] = r9 ?? this._$Ej?.get(e14) ?? r9, this._$Em = null;
    }
  }
  requestUpdate(t8, s5, i12, e14 = false, h3) {
    if (void 0 !== t8) {
      const r9 = this.constructor;
      if (false === e14 && (h3 = this[t8]), i12 ??= r9.getPropertyOptions(t8), !((i12.hasChanged ?? f)(h3, s5) || i12.useDefault && i12.reflect && h3 === this._$Ej?.get(t8) && !this.hasAttribute(r9._$Eu(t8, i12)))) return;
      this.C(t8, s5, i12);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t8, s5, { useDefault: i12, reflect: e14, wrapped: h3 }, r9) {
    i12 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t8) && (this._$Ej.set(t8, r9 ?? s5 ?? this[t8]), true !== h3 || void 0 !== r9) || (this._$AL.has(t8) || (this.hasUpdated || i12 || (s5 = void 0), this._$AL.set(t8, s5)), true === e14 && this._$Em !== t8 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t8));
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
      if (t9.size > 0) for (const [s6, i12] of t9) {
        const { wrapped: t10 } = i12, e14 = this[s6];
        true !== t10 || this._$AL.has(s6) || void 0 === e14 || this.C(s6, void 0, i12, e14);
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
var x = (t8) => (i12, ...s5) => ({ _$litType$: t8, strings: i12, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t8, i12) {
  if (!u2(t8) || !t8.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e4 ? e4.createHTML(i12) : i12;
}
var N = (t8, i12) => {
  const s5 = t8.length - 1, e14 = [];
  let n10, l3 = 2 === i12 ? "<svg>" : 3 === i12 ? "<math>" : "", c4 = v;
  for (let i13 = 0; i13 < s5; i13++) {
    const s6 = t8[i13];
    let a5, u3, d4 = -1, f3 = 0;
    for (; f3 < s6.length && (c4.lastIndex = f3, u3 = c4.exec(s6), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n10 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n10 ?? v, d4 = -1) : void 0 === u3[1] ? d4 = -2 : (d4 = c4.lastIndex - u3[2].length, a5 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n10 = void 0);
    const x2 = c4 === p2 && t8[i13 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s6 + r3 : d4 >= 0 ? (e14.push(a5), s6.slice(0, d4) + h2 + s6.slice(d4) + o3 + x2) : s6 + o3 + (-2 === d4 ? i13 : x2);
  }
  return [V(t8, l3 + (t8[s5] || "<?>") + (2 === i12 ? "</svg>" : 3 === i12 ? "</math>" : "")), e14];
};
var S2 = class _S {
  constructor({ strings: t8, _$litType$: i12 }, e14) {
    let r9;
    this.parts = [];
    let l3 = 0, a5 = 0;
    const u3 = t8.length - 1, d4 = this.parts, [f3, v2] = N(t8, i12);
    if (this.el = _S.createElement(f3, e14), P.currentNode = this.el.content, 2 === i12 || 3 === i12) {
      const t9 = this.el.content.firstChild;
      t9.replaceWith(...t9.childNodes);
    }
    for (; null !== (r9 = P.nextNode()) && d4.length < u3; ) {
      if (1 === r9.nodeType) {
        if (r9.hasAttributes()) for (const t9 of r9.getAttributeNames()) if (t9.endsWith(h2)) {
          const i13 = v2[a5++], s5 = r9.getAttribute(t9).split(o3), e15 = /([.?@])?(.*)/.exec(i13);
          d4.push({ type: 1, index: l3, name: e15[2], strings: s5, ctor: "." === e15[1] ? I : "?" === e15[1] ? L : "@" === e15[1] ? z : H }), r9.removeAttribute(t9);
        } else t9.startsWith(o3) && (d4.push({ type: 6, index: l3 }), r9.removeAttribute(t9));
        if (y2.test(r9.tagName)) {
          const t9 = r9.textContent.split(o3), i13 = t9.length - 1;
          if (i13 > 0) {
            r9.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i13; s5++) r9.append(t9[s5], c3()), P.nextNode(), d4.push({ type: 2, index: ++l3 });
            r9.append(t9[i13], c3());
          }
        }
      } else if (8 === r9.nodeType) if (r9.data === n3) d4.push({ type: 2, index: l3 });
      else {
        let t9 = -1;
        for (; -1 !== (t9 = r9.data.indexOf(o3, t9 + 1)); ) d4.push({ type: 7, index: l3 }), t9 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t8, i12) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t8, s5;
  }
};
function M(t8, i12, s5 = t8, e14) {
  if (i12 === E) return i12;
  let h3 = void 0 !== e14 ? s5._$Co?.[e14] : s5._$Cl;
  const o14 = a2(i12) ? void 0 : i12._$litDirective$;
  return h3?.constructor !== o14 && (h3?._$AO?.(false), void 0 === o14 ? h3 = void 0 : (h3 = new o14(t8), h3._$AT(t8, s5, e14)), void 0 !== e14 ? (s5._$Co ??= [])[e14] = h3 : s5._$Cl = h3), void 0 !== h3 && (i12 = M(t8, h3._$AS(t8, i12.values), h3, e14)), i12;
}
var R = class {
  constructor(t8, i12) {
    this._$AV = [], this._$AN = void 0, this._$AD = t8, this._$AM = i12;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t8) {
    const { el: { content: i12 }, parts: s5 } = this._$AD, e14 = (t8?.creationScope ?? l2).importNode(i12, true);
    P.currentNode = e14;
    let h3 = P.nextNode(), o14 = 0, n10 = 0, r9 = s5[0];
    for (; void 0 !== r9; ) {
      if (o14 === r9.index) {
        let i13;
        2 === r9.type ? i13 = new k(h3, h3.nextSibling, this, t8) : 1 === r9.type ? i13 = new r9.ctor(h3, r9.name, r9.strings, this, t8) : 6 === r9.type && (i13 = new Z(h3, this, t8)), this._$AV.push(i13), r9 = s5[++n10];
      }
      o14 !== r9?.index && (h3 = P.nextNode(), o14++);
    }
    return P.currentNode = l2, e14;
  }
  p(t8) {
    let i12 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t8, s5, i12), i12 += s5.strings.length - 2) : s5._$AI(t8[i12])), i12++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t8, i12, s5, e14) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t8, this._$AB = i12, this._$AM = s5, this.options = e14, this._$Cv = e14?.isConnected ?? true;
  }
  get parentNode() {
    let t8 = this._$AA.parentNode;
    const i12 = this._$AM;
    return void 0 !== i12 && 11 === t8?.nodeType && (t8 = i12.parentNode), t8;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t8, i12 = this) {
    t8 = M(this, t8, i12), a2(t8) ? t8 === A || null == t8 || "" === t8 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t8 !== this._$AH && t8 !== E && this._(t8) : void 0 !== t8._$litType$ ? this.$(t8) : void 0 !== t8.nodeType ? this.T(t8) : d2(t8) ? this.k(t8) : this._(t8);
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
    const { values: i12, _$litType$: s5 } = t8, e14 = "number" == typeof s5 ? this._$AC(t8) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e14) this._$AH.p(i12);
    else {
      const t9 = new R(e14, this), s6 = t9.u(this.options);
      t9.p(i12), this.T(s6), this._$AH = t9;
    }
  }
  _$AC(t8) {
    let i12 = C.get(t8.strings);
    return void 0 === i12 && C.set(t8.strings, i12 = new S2(t8)), i12;
  }
  k(t8) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i12 = this._$AH;
    let s5, e14 = 0;
    for (const h3 of t8) e14 === i12.length ? i12.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i12[e14], s5._$AI(h3), e14++;
    e14 < i12.length && (this._$AR(s5 && s5._$AB.nextSibling, e14), i12.length = e14);
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
  constructor(t8, i12, s5, e14, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t8, this.name = i12, this._$AM = e14, this.options = h3, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t8, i12 = this, s5, e14) {
    const h3 = this.strings;
    let o14 = false;
    if (void 0 === h3) t8 = M(this, t8, i12, 0), o14 = !a2(t8) || t8 !== this._$AH && t8 !== E, o14 && (this._$AH = t8);
    else {
      const e15 = t8;
      let n10, r9;
      for (t8 = h3[0], n10 = 0; n10 < h3.length - 1; n10++) r9 = M(this, e15[s5 + n10], i12, n10), r9 === E && (r9 = this._$AH[n10]), o14 ||= !a2(r9) || r9 !== this._$AH[n10], r9 === A ? t8 = A : t8 !== A && (t8 += (r9 ?? "") + h3[n10 + 1]), this._$AH[n10] = r9;
    }
    o14 && !e14 && this.j(t8);
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
  constructor(t8, i12, s5, e14, h3) {
    super(t8, i12, s5, e14, h3), this.type = 5;
  }
  _$AI(t8, i12 = this) {
    if ((t8 = M(this, t8, i12, 0) ?? A) === E) return;
    const s5 = this._$AH, e14 = t8 === A && s5 !== A || t8.capture !== s5.capture || t8.once !== s5.once || t8.passive !== s5.passive, h3 = t8 !== A && (s5 === A || e14);
    e14 && this.element.removeEventListener(this.name, this, s5), h3 && this.element.addEventListener(this.name, this, t8), this._$AH = t8;
  }
  handleEvent(t8) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t8) : this._$AH.handleEvent(t8);
  }
};
var Z = class {
  constructor(t8, i12, s5) {
    this.element = t8, this.type = 6, this._$AN = void 0, this._$AM = i12, this.options = s5;
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
var D = (t8, i12, s5) => {
  const e14 = s5?.renderBefore ?? i12;
  let h3 = e14._$litPart$;
  if (void 0 === h3) {
    const t9 = s5?.renderBefore ?? null;
    e14._$litPart$ = h3 = new k(i12.insertBefore(c3(), t9), t9, void 0, s5 ?? {});
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
function e6(e14, t8, n10, r9) {
  var i12 = arguments.length, a5 = i12 < 3 ? t8 : r9 === null ? r9 = Object.getOwnPropertyDescriptor(t8, n10) : r9, o14;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e14, t8, n10, r9);
  else for (var s5 = e14.length - 1; s5 >= 0; s5--) (o14 = e14[s5]) && (a5 = (i12 < 3 ? o14(a5) : i12 > 3 ? o14(t8, n10, a5) : o14(t8, n10)) || a5);
  return i12 > 3 && a5 && Object.defineProperty(t8, n10, a5), a5;
}

// node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t8 = o5, e14, r9) => {
  const { kind: n10, metadata: i12 } = r9;
  let s5 = globalThis.litPropertyMetadata.get(i12);
  if (void 0 === s5 && globalThis.litPropertyMetadata.set(i12, s5 = /* @__PURE__ */ new Map()), "setter" === n10 && ((t8 = Object.create(t8)).wrapped = true), s5.set(r9.name, t8), "accessor" === n10) {
    const { name: o14 } = r9;
    return { set(r10) {
      const n11 = e14.get.call(this);
      e14.set.call(this, r10), this.requestUpdate(o14, n11, t8, true, r10);
    }, init(e15) {
      return void 0 !== e15 && this.C(o14, void 0, t8, e15), e15;
    } };
  }
  if ("setter" === n10) {
    const { name: o14 } = r9;
    return function(r10) {
      const n11 = this[o14];
      e14.call(this, r10), this.requestUpdate(o14, n11, t8, true, r10);
    };
  }
  throw Error("Unsupported decorator location: " + n10);
};
function n4(t8) {
  return (e14, o14) => "object" == typeof o14 ? r4(t8, e14, o14) : ((t9, e15, o15) => {
    const r9 = e15.hasOwnProperty(o15);
    return e15.constructor.createProperty(o15, t9), r9 ? Object.getOwnPropertyDescriptor(e15, o15) : void 0;
  })(t8, e14, o14);
}

// node_modules/@lit/reactive-element/decorators/state.js
function r5(r9) {
  return n4({ ...r9, state: true, attribute: false });
}

// node_modules/@lit/reactive-element/decorators/base.js
var e7 = (e14, t8, c4) => (c4.configurable = true, c4.enumerable = true, Reflect.decorate && "object" != typeof t8 && Object.defineProperty(e14, t8, c4), c4);

// node_modules/@lit/reactive-element/decorators/query-assigned-elements.js
function o6(o14) {
  return (e14, n10) => {
    const { slot: r9, selector: s5 } = o14 ?? {}, c4 = "slot" + (r9 ? `[name=${r9}]` : ":not([name])");
    return e7(e14, n10, { get() {
      const t8 = this.renderRoot?.querySelector(c4), e15 = t8?.assignedElements(o14) ?? [];
      return void 0 === s5 ? e15 : e15.filter((t9) => t9.matches(s5));
    } });
  };
}

// deps/swc/swc-dist/core/element/define-element.js
function e8(e14, t8) {
  window.__swc && window.__swc.DEBUG && customElements.get(e14) && window.__swc.warn(void 0, `Attempted to redefine <${e14}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e14, t8);
}

// deps/swc/swc-dist/core/element/version.js
var e9 = "0.1.0";
var t4 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e10(e14 = document) {
  var t8;
  let n10 = e14.activeElement;
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
var o7 = class extends a3(i4) {
  get dir() {
    var e14;
    return (e14 = getComputedStyle(this).direction) == null ? "ltr" : e14;
  }
};
if (i5 = o7, i5.VERSION = e9, i5.CORE_VERSION = t4, true) {
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
      ...((l3 = window.__swc) == null ? void 0 : l3.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e15, t9, n10, { type: r9 = "api", level: i12 = "default", issues: a5 } = {}) => {
      let { localName: o14 = "base" } = e15 || {}, s6 = `${o14}:${r9}:${i12}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s6) || window.__swc.ignoreWarningLocalNames[o14] || window.__swc.ignoreWarningTypes[r9] || window.__swc.ignoreWarningLevels[i12]) return;
      window.__swc.issuedWarnings.add(s6);
      let c5 = "";
      a5 && a5.length && (a5.unshift(""), c5 = a5.join("\n    - ") + "\n");
      let l4 = i12 === "deprecation" ? "DEPRECATION NOTICE: " : "", u3 = e15 ? "\nInspect this issue in the follow element:" : "", d4 = (e15 ? "\n\n" : "\n") + n10 + "\n", f3 = [];
      f3.push(l4 + t9 + "\n" + c5 + u3), e15 && f3.push(e15), f3.push(d4, { data: {
        localName: o14,
        type: r9,
        level: i12
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s5;
var c4;
var l3;

// deps/swc/swc-dist/core/mixins/sized-mixin.js
var r6 = [
  "s",
  "m",
  "l",
  "xl"
];
function i7(n10, { validSizes: i12 = [...r6], noDefaultSize: a5, defaultSize: o14 = "m" } = {}) {
  var s5;
  class c4 extends n10 {
    constructor(...e14) {
      super(...e14), this._size = o14;
    }
    get size() {
      return this._size || o14;
    }
    set size(e14) {
      let t8 = a5 ? null : o14, n11 = e14 && e14.toLocaleLowerCase(), r9 = this.constructor.VALID_SIZES.includes(n11) ? n11 : t8;
      if (r9 && this.setAttribute("size", r9), this._size === r9) return;
      let i13 = this._size;
      this._size = r9, this.requestUpdate("size", i13);
    }
    update(e14) {
      !this.hasAttribute("size") && !a5 && this.setAttribute("size", this.size), super.update(e14);
    }
  }
  return s5 = c4, s5.VALID_SIZES = i12, e6([n4({ type: String })], c4.prototype, "size", null), c4;
}

// deps/swc/swc-dist/core/components/icon/Icon.base.js
var o11 = class extends i7(o7, { validSizes: [...e5] }) {
  constructor(...e14) {
    super(...e14), this.label = "";
  }
  firstUpdated(e14) {
    super.firstUpdated(e14), this.updateSlottedIcon(), this.updateHostAccessibility();
  }
  updated(e14) {
    super.updated(e14), e14.has("label") && (this.updateSlottedIcon(), this.updateHostAccessibility());
  }
  handleSlotChange() {
    this.updateSlottedIcon();
  }
  updateSlottedIcon() {
    var e14;
    let [t8] = this.defaultSlotElements;
    if (!t8) return;
    let n10 = t8 instanceof SVGElement ? t8 : (e14 = t8.querySelector) == null ? void 0 : e14.call(t8, "svg");
    n10 && (n10.setAttribute("role", "img"), this.label ? (n10.setAttribute("aria-label", this.label), n10.removeAttribute("aria-hidden")) : (n10.setAttribute("aria-hidden", "true"), n10.removeAttribute("aria-label")));
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
e8("swc-icon", r7);

// deps/swc/swc-dist/patterns/conversational-ai/utils/icons/index.js
var t5 = () => b2`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
    <path
      fill="currentColor"
      d="M16.25 9.25H10.75V3.75C10.75 3.33594 10.4141 3 10 3C9.58594 3 9.25 3.33594 9.25 3.75V9.25H3.75C3.33594 9.25 3 9.58594 3 10C3 10.4141 3.33594 10.75 3.75 10.75H9.25V16.25C9.25 16.6641 9.58594 17 10 17C10.4141 17 10.75 16.6641 10.75 16.25V10.75H16.25C16.6641 10.75 17 10.4141 17 10C17 9.58594 16.6641 9.25 16.25 9.25Z"
    />
  </svg>
`;
var r8 = () => b2`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
    <path
      fill="currentColor"
      d="M13.75 4H6.25C5.00736 4 4 5.00736 4 6.25V13.75C4 14.9926 5.00736 16 6.25 16H13.75C14.9926 16 16 14.9926 16 13.75V6.25C16 5.00736 14.9926 4 13.75 4Z"
    />
  </svg>
`;
var i9 = () => b2`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
    <path
      fill="currentColor"
      d="M14.5273 7.4668L10.5244 3.46973C10.2305 3.17578 9.75587 3.17774 9.46387 3.46973L5.4668 7.4668C5.17383 7.75977 5.17383 8.23438 5.4668 8.52735C5.61328 8.67383 5.80469 8.74708 5.99707 8.74708C6.18945 8.74708 6.38086 8.67384 6.52734 8.52735L9.25097 5.80372V15.75C9.25097 16.1641 9.58691 16.5 10.001 16.5C10.415 16.5 10.751 16.1641 10.751 15.75V5.81616L13.4668 8.52734C13.7607 8.82129 14.2353 8.81933 14.5273 8.52734C14.8203 8.23437 14.8203 7.7588 14.5273 7.4668Z"
    />
  </svg>
`;

// deps/swc/swc-dist/utils/id.js
function e12(e14) {
  return `${e14}-${Array.from(crypto.getRandomValues(new Uint8Array(4)), (e15) => `0${(e15 & 255).toString(16)}`.slice(-2)).join("")}`;
}

// deps/swc/swc-dist/patterns/conversational-ai/prompt-field/prompt-field.js
var t6 = i`:host{display:block;inline-size:100%}*,*:before,*:after{box-sizing:border-box}.swc-PromptField{display:flex;flex-direction:column;gap:12px;inline-size:100%}.swc-PromptField-box{display:flex;flex-direction:column;gap:16px;padding:16px;background:var(--swc-background-layer-2-color);border:1px solid transparent;border-radius:16px;box-shadow:0 1px 6px var(--swc-drop-shadow-color-100);overflow:hidden}.swc-PromptField-box.swc-PromptField-box--keyboard-focus{outline:2px solid var(--swc-blue-800);outline-offset:2px}.swc-PromptField-input-area{display:flex;flex-direction:column;gap:16px;padding-block-start:0;padding-inline:8px}.swc-PromptField-input-area.has-artifact{padding-block-start:8px}.swc-PromptField-artifacts{display:flex;flex-wrap:wrap;gap:16px;align-items:start}.swc-PromptField-artifacts>slot{display:contents}.swc-PromptField-artifacts>slot::slotted(*){flex:0 0 auto}.swc-PromptField-artifacts--single>slot::slotted([type=\"card\"]){flex-shrink:1;flex-basis:auto}.swc-PromptField-artifacts--multiple>slot::slotted([type=\"card\"]){flex-shrink:1;flex-basis:auto}.swc-PromptField-artifacts>slot::slotted([type=\"media\"]){inline-size:var(--swc-prompt-field-artifact-media-inline-size, 68px);min-inline-size:var(--swc-prompt-field-artifact-media-min-inline-size, 68px);block-size:var(--swc-prompt-field-artifact-media-block-size, 68px);min-block-size:var(--swc-prompt-field-artifact-media-min-block-size, 68px);aspect-ratio:1 / 1}.swc-PromptField-text-area{display:flex;flex-direction:column;gap:4px}.swc-PromptField-label{display:block;font-family:var(--swc-sans-font-family-stack);font-size:var(--swc-font-size-100);font-weight:400;line-height:1.3;color:var(--swc-gray-700)}.swc-PromptField-textarea{field-sizing:content;display:block;inline-size:100%;min-block-size:calc(var(--swc-font-size-100) * 1.3 * var(--swc-prompt-field-textarea-min-rows, 1));max-block-size:calc(var(--swc-font-size-100) * 1.3 * var(--swc-prompt-field-textarea-max-rows, 4));padding:0;font-family:var(--swc-sans-font-family-stack);font-size:var(--swc-font-size-100);font-weight:400;line-height:1.3;color:var(--swc-gray-900);background:transparent;border:none;resize:none;outline:none}.swc-PromptField-textarea::-moz-placeholder{color:var(--swc-gray-600)}.swc-PromptField-textarea::placeholder{color:var(--swc-gray-600)}.swc-PromptField-textarea:disabled{color:var(--swc-gray-500);cursor:default}.swc-PromptField-action-bar{display:flex;align-items:center;justify-content:space-between}.swc-PromptField-leading-actions{display:inline-flex;gap:4px;align-items:center}.swc-PromptField-file-input{display:none}.swc-PromptField-upload{display:flex;align-items:center;justify-content:center;inline-size:var(--swc-prompt-field-upload-inline-size, 32px);block-size:var(--swc-prompt-field-upload-block-size, 32px);padding:0;color:var(--swc-gray-800);background:transparent;border:1px solid transparent;border-radius:8px}.swc-PromptField-upload:hover{color:var(--swc-gray-800);background:var(--swc-gray-75)}.swc-PromptField-upload:disabled{color:var(--swc-gray-400);background:transparent}.swc-PromptField-upload swc-icon{--swc-icon-inline-size: var(--swc-workflow-icon-medium);--swc-icon-block-size: var(--swc-workflow-icon-medium)}.swc-PromptField-send{display:flex;align-items:center;justify-content:center;inline-size:var(--swc-prompt-field-send-inline-size, 32px);block-size:var(--swc-prompt-field-send-block-size, 32px);padding:0;color:var(--swc-gray-25);background:var(--swc-gray-800);border:1px solid transparent;border-radius:50%;transition:background .13s ease}.swc-PromptField-stop{display:flex;align-items:center;justify-content:center;inline-size:var(--swc-prompt-field-stop-inline-size, 32px);block-size:var(--swc-prompt-field-stop-block-size, 32px);padding:0;color:var(--swc-gray-25);background:var(--swc-gray-900);border:1px solid transparent;border-radius:50%;transition:background .13s ease}.swc-PromptField-send:disabled{color:var(--swc-gray-400);background:var(--swc-gray-100)}.swc-PromptField-send:focus-visible,.swc-PromptField-stop:focus-visible{outline:2px solid var(--swc-blue-800);outline-offset:2px}.swc-PromptField-send:active,.swc-PromptField-stop:active{transform:perspective(64px) translateZ(-1px);transition:transform .16s ease;transition-timing-function:cubic-bezier(.45,0,.4,1);will-change:transform}.swc-PromptField-send:hover:not(:disabled){background:var(--swc-gray-900)}.swc-PromptField-send swc-icon{--swc-icon-inline-size: var(--swc-workflow-icon-medium);--swc-icon-block-size: var(--swc-workflow-icon-medium)}.swc-PromptField-stop:hover{background:var(--swc-gray-800)}.swc-PromptField-stop swc-icon{--swc-icon-inline-size: var(--swc-workflow-icon-medium);--swc-icon-block-size: var(--swc-workflow-icon-medium)}.swc-PromptField-footer{display:flex;align-items:center;justify-content:center}.swc-PromptField-legal-disclaimer{margin:0;font-size:var(--swc-font-size-75);line-height:var(--swc-line-height-font-size-75);color:var(--swc-gray-700)}.swc-PromptField-legal-disclaimer a{color:inherit}.swc-PromptField-artifacts[hidden]{display:none!important}`;

// node_modules/lit-html/directives/if-defined.js
var o12 = (o14) => o14 ?? A;

// node_modules/lit-html/directive.js
var t7 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e13 = (t8) => (...e14) => ({ _$litDirective$: t8, values: e14 });
var i10 = class {
  constructor(t8) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t8, e14, i12) {
    this._$Ct = t8, this._$AM = e14, this._$Ci = i12;
  }
  _$AS(t8, e14) {
    return this.update(t8, e14);
  }
  update(t8, e14) {
    return this.render(...e14);
  }
};

// node_modules/lit-html/directives/style-map.js
var n9 = "important";
var i11 = " !" + n9;
var o13 = e13(class extends i10 {
  constructor(t8) {
    if (super(t8), t8.type !== t7.ATTRIBUTE || "style" !== t8.name || t8.strings?.length > 2) throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.");
  }
  render(t8) {
    return Object.keys(t8).reduce((e14, r9) => {
      const s5 = t8[r9];
      return null == s5 ? e14 : e14 + `${r9 = r9.includes("-") ? r9 : r9.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, "-$&").toLowerCase()}:${s5};`;
    }, "");
  }
  update(e14, [r9]) {
    const { style: s5 } = e14.element;
    if (void 0 === this.ft) return this.ft = new Set(Object.keys(r9)), this.render(r9);
    for (const t8 of this.ft) null == r9[t8] && (this.ft.delete(t8), t8.includes("-") ? s5.removeProperty(t8) : s5[t8] = null);
    for (const t8 in r9) {
      const e15 = r9[t8];
      if (null != e15) {
        this.ft.add(t8);
        const r10 = "string" == typeof e15 && e15.endsWith(i11);
        t8.includes("-") || r10 ? s5.setProperty(t8, r10 ? e15.slice(0, -11) : e15, r10 ? n9 : "") : s5[t8] = e15;
      }
    }
    return E;
  }
});

// deps/swc/swc-dist/patterns/conversational-ai/prompt-field/PromptField.js
var p3 = class extends o7 {
  constructor(...e14) {
    super(...e14), this.labelId = e12("swc-prompt-field-label"), this.mode = "default", this.label = "Prompt", this.accessibleLabel = "", this.sendLabel = "Send", this.stopLabel = "Stop generating", this.uploadLabel = "Add attachment", this.placeholder = "Ready to get started? Ask a question, share an idea, or add a task.", this.value = "", this.minRows = 1, this.maxRows = 4, this._textareaFocusFromPointer = false, this._promptBoxKeyboardFocusRing = false;
  }
  static get styles() {
    return [t6];
  }
  _handleInput(e14) {
    this.value = e14.target.value, this.dispatchEvent(new CustomEvent("swc-prompt-field-input", {
      bubbles: true,
      composed: true,
      detail: { value: this.value }
    }));
  }
  _handleTextareaPointerDown(e14) {
    if (e14.currentTarget.matches(":focus")) {
      this._promptBoxKeyboardFocusRing = false;
      return;
    }
    this._textareaFocusFromPointer = true;
  }
  _handleTextareaFocusIn() {
    let e14 = !this._textareaFocusFromPointer;
    this._textareaFocusFromPointer = false, this._promptBoxKeyboardFocusRing = e14;
  }
  _handleTextareaFocusOut() {
    this._promptBoxKeyboardFocusRing = false, this._textareaFocusFromPointer = false;
  }
  _handleTextareaKeydown(e14) {
    e14.key !== "Enter" || e14.shiftKey || e14.isComposing || (e14.preventDefault(), !(this._isLoading || this._isDisabled) && this._handleSendClick());
  }
  _handleSendClick() {
    !this._isPopulated || this._isDisabled || this.dispatchEvent(new CustomEvent("swc-prompt-field-submit", {
      bubbles: true,
      composed: true,
      detail: { value: this.value }
    }));
  }
  _handleStopClick() {
    this.dispatchEvent(new CustomEvent("swc-prompt-field-stop", {
      bubbles: true,
      composed: true
    }));
  }
  _handleUploadClick() {
    this.dispatchEvent(new CustomEvent("swc-prompt-field-upload-click", {
      bubbles: true,
      composed: true,
      cancelable: true
    }));
  }
  _handleArtifactSlotChange() {
    this.requestUpdate();
  }
  get _isPopulated() {
    var e14, t8;
    return this.value.trim().length > 0 || ((e14 = (t8 = this._assignedArtifactElements) == null ? void 0 : t8.length) == null ? 0 : e14) > 0;
  }
  get _normalizedMinRows() {
    return Math.max(1, Math.floor(this.minRows || 1));
  }
  get _normalizedMaxRows() {
    return Math.max(this._normalizedMinRows, Math.floor(this.maxRows || this._normalizedMinRows));
  }
  get _isLoading() {
    return this.mode === "loading";
  }
  get _isDisabled() {
    return this.mode === "disabled";
  }
  _handleLegalSlotChange() {
    this.requestUpdate();
  }
  _renderLegalFooter() {
    var e14, t8;
    return ((e14 = (t8 = this._assignedLegalElements) == null ? void 0 : t8.length) == null ? 0 : e14) === 0 ? b2`
        <slot
          name="legal"
          hidden
          @slotchange=${this._handleLegalSlotChange}
        ></slot>
      ` : b2`
      <div class="swc-PromptField-footer">
        <slot name="legal" @slotchange=${this._handleLegalSlotChange}></slot>
      </div>
    `;
  }
  _renderArtifact() {
    var e14, t8;
    let n10 = (e14 = (t8 = this._assignedArtifactElements) == null ? void 0 : t8.length) == null ? 0 : e14;
    return b2`
      <div class=${n10 <= 1 ? "swc-PromptField-artifacts swc-PromptField-artifacts--single" : "swc-PromptField-artifacts swc-PromptField-artifacts--multiple"} ?hidden=${n10 === 0}>
        <slot
          name="artifact"
          @slotchange=${this._handleArtifactSlotChange}
        ></slot>
      </div>
    `;
  }
  _renderSendButton() {
    return b2`
      <button
        class="swc-PromptField-send"
        ?disabled=${!this._isPopulated || this._isDisabled}
        aria-label=${this.sendLabel}
        @click=${this._handleSendClick}
      >
        <swc-icon aria-hidden="true">${i9()}</swc-icon>
      </button>
    `;
  }
  _renderStopButton() {
    return b2`
      <button
        class="swc-PromptField-stop"
        aria-label=${this.stopLabel}
        @click=${this._handleStopClick}
      >
        <swc-icon aria-hidden="true">${r8()}</swc-icon>
      </button>
    `;
  }
  render() {
    var e14, t8;
    let r9 = this._isLoading, i12 = ((e14 = (t8 = this._assignedArtifactElements) == null ? void 0 : t8.length) == null ? 0 : e14) > 0;
    return b2`
      <div class="swc-PromptField">
        <div
          class="swc-PromptField-box${this._promptBoxKeyboardFocusRing ? " swc-PromptField-box--keyboard-focus" : ""}"
        >
          <div
            class="swc-PromptField-input-area${i12 ? " has-artifact" : ""}"
          >
            ${this._renderArtifact()}
            <div class="swc-PromptField-text-area">
              <span id=${this.labelId} class="swc-PromptField-label">
                ${this.label}
              </span>
              <textarea
                class="swc-PromptField-textarea"
                .value=${this.value}
                placeholder=${this.placeholder}
                aria-labelledby=${this.labelId}
                aria-label=${o12(this.accessibleLabel.trim().length > 0 ? this.accessibleLabel.trim() : void 0)}
                aria-placeholder=${o12(this.placeholder || void 0)}
                ?disabled=${this._isDisabled}
                rows=${this._normalizedMinRows}
                style=${o13({
      "--swc-prompt-field-textarea-min-rows": String(this._normalizedMinRows),
      "--swc-prompt-field-textarea-max-rows": String(this._normalizedMaxRows)
    })}
                @input=${this._handleInput}
                @keydown=${this._handleTextareaKeydown}
                @pointerdown=${this._handleTextareaPointerDown}
                @focusin=${this._handleTextareaFocusIn}
                @focusout=${this._handleTextareaFocusOut}
              ></textarea>
            </div>
          </div>

          <div class="swc-PromptField-action-bar">
            <div class="swc-PromptField-leading-actions">
              <button
                class="swc-PromptField-upload"
                aria-label=${this.uploadLabel}
                ?disabled=${this._isDisabled}
                @click=${this._handleUploadClick}
              >
                <swc-icon aria-hidden="true">${t5()}</swc-icon>
              </button>
            </div>

            ${r9 ? this._renderStopButton() : this._renderSendButton()}
          </div>
        </div>
        ${this._renderLegalFooter()}
      </div>
    `;
  }
};
e([n4({
  type: String,
  reflect: true
})], p3.prototype, "mode", void 0), e([n4({ type: String })], p3.prototype, "label", void 0), e([n4({
  type: String,
  attribute: "accessible-label"
})], p3.prototype, "accessibleLabel", void 0), e([n4({
  type: String,
  attribute: "send-label"
})], p3.prototype, "sendLabel", void 0), e([n4({
  type: String,
  attribute: "stop-label"
})], p3.prototype, "stopLabel", void 0), e([n4({
  type: String,
  attribute: "upload-label"
})], p3.prototype, "uploadLabel", void 0), e([n4({ type: String })], p3.prototype, "placeholder", void 0), e([n4({ type: String })], p3.prototype, "value", void 0), e([n4({
  type: Number,
  attribute: "min-rows"
})], p3.prototype, "minRows", void 0), e([n4({
  type: Number,
  attribute: "max-rows"
})], p3.prototype, "maxRows", void 0), e([o6({
  slot: "artifact",
  flatten: true
})], p3.prototype, "_assignedArtifactElements", void 0), e([o6({
  slot: "legal",
  flatten: true
})], p3.prototype, "_assignedLegalElements", void 0), e([r5()], p3.prototype, "_promptBoxKeyboardFocusRing", void 0);

// deps/swc/swc-dist/patterns/conversational-ai/prompt-field/index.js
e8("swc-prompt-field", p3);
export {
  p3 as PromptField
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
lit-html/directives/style-map.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
