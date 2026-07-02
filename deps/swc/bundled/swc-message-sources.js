// deps/swc/swc-dist/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e(e14, t9, n11, r10) {
  var i10 = arguments.length, a5 = i10 < 3 ? t9 : r10 === null ? r10 = Object.getOwnPropertyDescriptor(t9, n11) : r10, o14;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e14, t9, n11, r10);
  else for (var s6 = e14.length - 1; s6 >= 0; s6--) (o14 = e14[s6]) && (a5 = (i10 < 3 ? o14(a5) : i10 > 3 ? o14(t9, n11, a5) : o14(t9, n11)) || a5);
  return i10 > 3 && a5 && Object.defineProperty(t9, n11, a5), a5;
}

// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e2 = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t9, e14, o14) {
    if (this._$cssResult$ = true, o14 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t9, this.t = e14;
  }
  get styleSheet() {
    let t9 = this.o;
    const s6 = this.t;
    if (e2 && void 0 === t9) {
      const e14 = void 0 !== s6 && 1 === s6.length;
      e14 && (t9 = o.get(s6)), void 0 === t9 && ((this.o = t9 = new CSSStyleSheet()).replaceSync(this.cssText), e14 && o.set(s6, t9));
    }
    return t9;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t9) => new n("string" == typeof t9 ? t9 : t9 + "", void 0, s);
var i = (t9, ...e14) => {
  const o14 = 1 === t9.length ? t9[0] : e14.reduce((e15, s6, o15) => e15 + ((t10) => {
    if (true === t10._$cssResult$) return t10.cssText;
    if ("number" == typeof t10) return t10;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t10 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s6) + t9[o15 + 1], t9[0]);
  return new n(o14, t9, s);
};
var S = (s6, o14) => {
  if (e2) s6.adoptedStyleSheets = o14.map((t9) => t9 instanceof CSSStyleSheet ? t9 : t9.styleSheet);
  else for (const e14 of o14) {
    const o15 = document.createElement("style"), n11 = t.litNonce;
    void 0 !== n11 && o15.setAttribute("nonce", n11), o15.textContent = e14.cssText, s6.appendChild(o15);
  }
};
var c = e2 ? (t9) => t9 : (t9) => t9 instanceof CSSStyleSheet ? ((t10) => {
  let e14 = "";
  for (const s6 of t10.cssRules) e14 += s6.cssText;
  return r(e14);
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
      const i10 = /* @__PURE__ */ Symbol(), h4 = this.getPropertyDescriptor(t9, i10, s6);
      void 0 !== h4 && e3(this.prototype, t9, h4);
    }
  }
  static getPropertyDescriptor(t9, s6, i10) {
    const { get: e14, set: r10 } = h(this.prototype, t9) ?? { get() {
      return this[s6];
    }, set(t10) {
      this[s6] = t10;
    } };
    return { get: e14, set(s7) {
      const h4 = e14?.call(this);
      r10?.call(this, s7), this.requestUpdate(t9, h4, i10);
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
      const e14 = new Set(s6.flat(1 / 0).reverse());
      for (const s7 of e14) i10.unshift(c(s7));
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
    const i10 = this.constructor.elementProperties.get(t9), e14 = this.constructor._$Eu(t9, i10);
    if (void 0 !== e14 && true === i10.reflect) {
      const h4 = (void 0 !== i10.converter?.toAttribute ? i10.converter : u).toAttribute(s6, i10.type);
      this._$Em = t9, null == h4 ? this.removeAttribute(e14) : this.setAttribute(e14, h4), this._$Em = null;
    }
  }
  _$AK(t9, s6) {
    const i10 = this.constructor, e14 = i10._$Eh.get(t9);
    if (void 0 !== e14 && this._$Em !== e14) {
      const t10 = i10.getPropertyOptions(e14), h4 = "function" == typeof t10.converter ? { fromAttribute: t10.converter } : void 0 !== t10.converter?.fromAttribute ? t10.converter : u;
      this._$Em = e14;
      const r10 = h4.fromAttribute(s6, t10.type);
      this[e14] = r10 ?? this._$Ej?.get(e14) ?? r10, this._$Em = null;
    }
  }
  requestUpdate(t9, s6, i10, e14 = false, h4) {
    if (void 0 !== t9) {
      const r10 = this.constructor;
      if (false === e14 && (h4 = this[t9]), i10 ??= r10.getPropertyOptions(t9), !((i10.hasChanged ?? f)(h4, s6) || i10.useDefault && i10.reflect && h4 === this._$Ej?.get(t9) && !this.hasAttribute(r10._$Eu(t9, i10)))) return;
      this.C(t9, s6, i10);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t9, s6, { useDefault: i10, reflect: e14, wrapped: h4 }, r10) {
    i10 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t9) && (this._$Ej.set(t9, r10 ?? s6 ?? this[t9]), true !== h4 || void 0 !== r10) || (this._$AL.has(t9) || (this.hasUpdated || i10 || (s6 = void 0), this._$AL.set(t9, s6)), true === e14 && this._$Em !== t9 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t9));
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
        const { wrapped: t11 } = i10, e14 = this[s7];
        true !== t11 || this._$AL.has(s7) || void 0 === e14 || this.C(s7, void 0, i10, e14);
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
  const s6 = t9.length - 1, e14 = [];
  let n11, l4 = 2 === i10 ? "<svg>" : 3 === i10 ? "<math>" : "", c5 = v;
  for (let i11 = 0; i11 < s6; i11++) {
    const s7 = t9[i11];
    let a5, u3, d4 = -1, f4 = 0;
    for (; f4 < s7.length && (c5.lastIndex = f4, u3 = c5.exec(s7), null !== u3); ) f4 = c5.lastIndex, c5 === v ? "!--" === u3[1] ? c5 = _ : void 0 !== u3[1] ? c5 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n11 = RegExp("</" + u3[2], "g")), c5 = p2) : void 0 !== u3[3] && (c5 = p2) : c5 === p2 ? ">" === u3[0] ? (c5 = n11 ?? v, d4 = -1) : void 0 === u3[1] ? d4 = -2 : (d4 = c5.lastIndex - u3[2].length, a5 = u3[1], c5 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c5 === $ || c5 === g ? c5 = p2 : c5 === _ || c5 === m ? c5 = v : (c5 = p2, n11 = void 0);
    const x2 = c5 === p2 && t9[i11 + 1].startsWith("/>") ? " " : "";
    l4 += c5 === v ? s7 + r3 : d4 >= 0 ? (e14.push(a5), s7.slice(0, d4) + h2 + s7.slice(d4) + o3 + x2) : s7 + o3 + (-2 === d4 ? i11 : x2);
  }
  return [V(t9, l4 + (t9[s6] || "<?>") + (2 === i10 ? "</svg>" : 3 === i10 ? "</math>" : "")), e14];
};
var S2 = class _S {
  constructor({ strings: t9, _$litType$: i10 }, e14) {
    let r10;
    this.parts = [];
    let l4 = 0, a5 = 0;
    const u3 = t9.length - 1, d4 = this.parts, [f4, v2] = N(t9, i10);
    if (this.el = _S.createElement(f4, e14), P.currentNode = this.el.content, 2 === i10 || 3 === i10) {
      const t10 = this.el.content.firstChild;
      t10.replaceWith(...t10.childNodes);
    }
    for (; null !== (r10 = P.nextNode()) && d4.length < u3; ) {
      if (1 === r10.nodeType) {
        if (r10.hasAttributes()) for (const t10 of r10.getAttributeNames()) if (t10.endsWith(h2)) {
          const i11 = v2[a5++], s6 = r10.getAttribute(t10).split(o3), e15 = /([.?@])?(.*)/.exec(i11);
          d4.push({ type: 1, index: l4, name: e15[2], strings: s6, ctor: "." === e15[1] ? I : "?" === e15[1] ? L : "@" === e15[1] ? z : H }), r10.removeAttribute(t10);
        } else t10.startsWith(o3) && (d4.push({ type: 6, index: l4 }), r10.removeAttribute(t10));
        if (y2.test(r10.tagName)) {
          const t10 = r10.textContent.split(o3), i11 = t10.length - 1;
          if (i11 > 0) {
            r10.textContent = s2 ? s2.emptyScript : "";
            for (let s6 = 0; s6 < i11; s6++) r10.append(t10[s6], c3()), P.nextNode(), d4.push({ type: 2, index: ++l4 });
            r10.append(t10[i11], c3());
          }
        }
      } else if (8 === r10.nodeType) if (r10.data === n3) d4.push({ type: 2, index: l4 });
      else {
        let t10 = -1;
        for (; -1 !== (t10 = r10.data.indexOf(o3, t10 + 1)); ) d4.push({ type: 7, index: l4 }), t10 += o3.length - 1;
      }
      l4++;
    }
  }
  static createElement(t9, i10) {
    const s6 = l2.createElement("template");
    return s6.innerHTML = t9, s6;
  }
};
function M(t9, i10, s6 = t9, e14) {
  if (i10 === E) return i10;
  let h4 = void 0 !== e14 ? s6._$Co?.[e14] : s6._$Cl;
  const o14 = a2(i10) ? void 0 : i10._$litDirective$;
  return h4?.constructor !== o14 && (h4?._$AO?.(false), void 0 === o14 ? h4 = void 0 : (h4 = new o14(t9), h4._$AT(t9, s6, e14)), void 0 !== e14 ? (s6._$Co ??= [])[e14] = h4 : s6._$Cl = h4), void 0 !== h4 && (i10 = M(t9, h4._$AS(t9, i10.values), h4, e14)), i10;
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
    const { el: { content: i10 }, parts: s6 } = this._$AD, e14 = (t9?.creationScope ?? l2).importNode(i10, true);
    P.currentNode = e14;
    let h4 = P.nextNode(), o14 = 0, n11 = 0, r10 = s6[0];
    for (; void 0 !== r10; ) {
      if (o14 === r10.index) {
        let i11;
        2 === r10.type ? i11 = new k(h4, h4.nextSibling, this, t9) : 1 === r10.type ? i11 = new r10.ctor(h4, r10.name, r10.strings, this, t9) : 6 === r10.type && (i11 = new Z(h4, this, t9)), this._$AV.push(i11), r10 = s6[++n11];
      }
      o14 !== r10?.index && (h4 = P.nextNode(), o14++);
    }
    return P.currentNode = l2, e14;
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
  constructor(t9, i10, s6, e14) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t9, this._$AB = i10, this._$AM = s6, this.options = e14, this._$Cv = e14?.isConnected ?? true;
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
    const { values: i10, _$litType$: s6 } = t9, e14 = "number" == typeof s6 ? this._$AC(t9) : (void 0 === s6.el && (s6.el = S2.createElement(V(s6.h, s6.h[0]), this.options)), s6);
    if (this._$AH?._$AD === e14) this._$AH.p(i10);
    else {
      const t10 = new R(e14, this), s7 = t10.u(this.options);
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
    let s6, e14 = 0;
    for (const h4 of t9) e14 === i10.length ? i10.push(s6 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s6 = i10[e14], s6._$AI(h4), e14++;
    e14 < i10.length && (this._$AR(s6 && s6._$AB.nextSibling, e14), i10.length = e14);
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
  constructor(t9, i10, s6, e14, h4) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t9, this.name = i10, this._$AM = e14, this.options = h4, s6.length > 2 || "" !== s6[0] || "" !== s6[1] ? (this._$AH = Array(s6.length - 1).fill(new String()), this.strings = s6) : this._$AH = A;
  }
  _$AI(t9, i10 = this, s6, e14) {
    const h4 = this.strings;
    let o14 = false;
    if (void 0 === h4) t9 = M(this, t9, i10, 0), o14 = !a2(t9) || t9 !== this._$AH && t9 !== E, o14 && (this._$AH = t9);
    else {
      const e15 = t9;
      let n11, r10;
      for (t9 = h4[0], n11 = 0; n11 < h4.length - 1; n11++) r10 = M(this, e15[s6 + n11], i10, n11), r10 === E && (r10 = this._$AH[n11]), o14 ||= !a2(r10) || r10 !== this._$AH[n11], r10 === A ? t9 = A : t9 !== A && (t9 += (r10 ?? "") + h4[n11 + 1]), this._$AH[n11] = r10;
    }
    o14 && !e14 && this.j(t9);
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
  constructor(t9, i10, s6, e14, h4) {
    super(t9, i10, s6, e14, h4), this.type = 5;
  }
  _$AI(t9, i10 = this) {
    if ((t9 = M(this, t9, i10, 0) ?? A) === E) return;
    const s6 = this._$AH, e14 = t9 === A && s6 !== A || t9.capture !== s6.capture || t9.once !== s6.once || t9.passive !== s6.passive, h4 = t9 !== A && (s6 === A || e14);
    e14 && this.element.removeEventListener(this.name, this, s6), h4 && this.element.addEventListener(this.name, this, t9), this._$AH = t9;
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
var j = { M: h2, P: o3, A: n3, C: 1, L: N, R, D: d2, V: M, I: k, H, N: L, U: z, B: I, F: Z };
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.2");
var D = (t9, i10, s6) => {
  const e14 = s6?.renderBefore ?? i10;
  let h4 = e14._$litPart$;
  if (void 0 === h4) {
    const t10 = s6?.renderBefore ?? null;
    e14._$litPart$ = h4 = new k(i10.insertBefore(c3(), t10), t10, void 0, s6 ?? {});
  }
  return h4._$AI(t9), h4;
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
    const r10 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t9), this._$Do = D(r10, this.renderRoot, this.renderOptions);
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
function e6(e14, t9, n11, r10) {
  var i10 = arguments.length, a5 = i10 < 3 ? t9 : r10 === null ? r10 = Object.getOwnPropertyDescriptor(t9, n11) : r10, o14;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e14, t9, n11, r10);
  else for (var s6 = e14.length - 1; s6 >= 0; s6--) (o14 = e14[s6]) && (a5 = (i10 < 3 ? o14(a5) : i10 > 3 ? o14(t9, n11, a5) : o14(t9, n11)) || a5);
  return i10 > 3 && a5 && Object.defineProperty(t9, n11, a5), a5;
}

// node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t9 = o5, e14, r10) => {
  const { kind: n11, metadata: i10 } = r10;
  let s6 = globalThis.litPropertyMetadata.get(i10);
  if (void 0 === s6 && globalThis.litPropertyMetadata.set(i10, s6 = /* @__PURE__ */ new Map()), "setter" === n11 && ((t9 = Object.create(t9)).wrapped = true), s6.set(r10.name, t9), "accessor" === n11) {
    const { name: o14 } = r10;
    return { set(r11) {
      const n12 = e14.get.call(this);
      e14.set.call(this, r11), this.requestUpdate(o14, n12, t9, true, r11);
    }, init(e15) {
      return void 0 !== e15 && this.C(o14, void 0, t9, e15), e15;
    } };
  }
  if ("setter" === n11) {
    const { name: o14 } = r10;
    return function(r11) {
      const n12 = this[o14];
      e14.call(this, r11), this.requestUpdate(o14, n12, t9, true, r11);
    };
  }
  throw Error("Unsupported decorator location: " + n11);
};
function n4(t9) {
  return (e14, o14) => "object" == typeof o14 ? r4(t9, e14, o14) : ((t10, e15, o15) => {
    const r10 = e15.hasOwnProperty(o15);
    return e15.constructor.createProperty(o15, t10), r10 ? Object.getOwnPropertyDescriptor(e15, o15) : void 0;
  })(t9, e14, o14);
}

// node_modules/@lit/reactive-element/decorators/state.js
function r5(r10) {
  return n4({ ...r10, state: true, attribute: false });
}

// node_modules/@lit/reactive-element/decorators/base.js
var e7 = (e14, t9, c5) => (c5.configurable = true, c5.enumerable = true, Reflect.decorate && "object" != typeof t9 && Object.defineProperty(e14, t9, c5), c5);

// node_modules/@lit/reactive-element/decorators/query-assigned-elements.js
function o6(o14) {
  return (e14, n11) => {
    const { slot: r10, selector: s6 } = o14 ?? {}, c5 = "slot" + (r10 ? `[name=${r10}]` : ":not([name])");
    return e7(e14, n11, { get() {
      const t9 = this.renderRoot?.querySelector(c5), e15 = t9?.assignedElements(o14) ?? [];
      return void 0 === s6 ? e15 : e15.filter((t10) => t10.matches(s6));
    } });
  };
}

// deps/swc/swc-dist/core/element/define-element.js
function e8(e14, t9) {
  window.__swc && window.__swc.DEBUG && customElements.get(e14) && window.__swc.warn(void 0, `Attempted to redefine <${e14}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e14, t9);
}

// deps/swc/swc-dist/core/element/version.js
var e9 = "0.1.0";
var t5 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e10(e14 = document) {
  var t9;
  let n11 = e14.activeElement;
  for (; !(n11 == null || (t9 = n11.shadowRoot) == null) && t9.activeElement; ) n11 = n11.shadowRoot.activeElement;
  return n11;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i5;
function a3(t9) {
  class n11 extends t9 {
    hasVisibleFocusInTree() {
      var t10;
      let n12 = e10(this.getRootNode());
      return (t10 = n12 == null ? void 0 : n12.matches(":focus-visible")) == null ? false : t10;
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
if (i5 = o7, i5.VERSION = e9, i5.CORE_VERSION = t5, true) {
  let e14 = {
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
      ...e14,
      ...((c5 = window.__swc) == null ? void 0 : c5.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t9,
      ...((l4 = window.__swc) == null ? void 0 : l4.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e15, t10, n11, { type: r10 = "api", level: i10 = "default", issues: a5 } = {}) => {
      let { localName: o14 = "base" } = e15 || {}, s7 = `${o14}:${r10}:${i10}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s7) || window.__swc.ignoreWarningLocalNames[o14] || window.__swc.ignoreWarningTypes[r10] || window.__swc.ignoreWarningLevels[i10]) return;
      window.__swc.issuedWarnings.add(s7);
      let c6 = "";
      a5 && a5.length && (a5.unshift(""), c6 = a5.join("\n    - ") + "\n");
      let l5 = i10 === "deprecation" ? "DEPRECATION NOTICE: " : "", u3 = e15 ? "\nInspect this issue in the follow element:" : "", d4 = (e15 ? "\n\n" : "\n") + n11 + "\n", f4 = [];
      f4.push(l5 + t10 + "\n" + c6 + u3), e15 && f4.push(e15), f4.push(d4, { data: {
        localName: o14,
        type: r10,
        level: i10
      } }), console.warn(...f4);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s6;
var c5;
var l4;

// deps/swc/swc-dist/core/mixins/sized-mixin.js
var r6 = [
  "s",
  "m",
  "l",
  "xl"
];
function i7(n11, { validSizes: i10 = [...r6], noDefaultSize: a5, defaultSize: o14 = "m" } = {}) {
  var s6;
  class c5 extends n11 {
    constructor(...e14) {
      super(...e14), this._size = o14;
    }
    get size() {
      return this._size || o14;
    }
    set size(e14) {
      let t9 = a5 ? null : o14, n12 = e14 && e14.toLocaleLowerCase(), r10 = this.constructor.VALID_SIZES.includes(n12) ? n12 : t9;
      if (r10 && this.setAttribute("size", r10), this._size === r10) return;
      let i11 = this._size;
      this._size = r10, this.requestUpdate("size", i11);
    }
    update(e14) {
      !this.hasAttribute("size") && !a5 && this.setAttribute("size", this.size), super.update(e14);
    }
  }
  return s6 = c5, s6.VALID_SIZES = i10, e6([n4({ type: String })], c5.prototype, "size", null), c5;
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
    let [t9] = this.defaultSlotElements;
    if (!t9) return;
    let n11 = t9 instanceof SVGElement ? t9 : (e14 = t9.querySelector) == null ? void 0 : e14.call(t9, "svg");
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
e8("swc-icon", r7);

// deps/swc/swc-dist/utils/id.js
function e12(e14) {
  return `${e14}-${Array.from(crypto.getRandomValues(new Uint8Array(4)), (e15) => `0${(e15 & 255).toString(16)}`.slice(-2)).join("")}`;
}

// deps/swc/swc-dist/patterns/conversational-ai/message-sources/message-sources.js
var t6 = i`:host{display:block}*,*:before,*:after{box-sizing:border-box}.swc-MessageSources{display:flex;flex-direction:column;gap:var(--swc-message-sources-gap, 8px)}.swc-MessageSources-toggle{display:inline-flex;gap:var(--swc-sources-toggle-gap, 8px);align-items:center;inline-size:-moz-fit-content;inline-size:fit-content;padding:var(--swc-sources-toggle-padding, 3px) 8px;font-family:var(--swc-sans-font-family-stack);font-size:var(--swc-font-size-100);font-weight:700;line-height:var(--swc-line-height-font-size-100);color:var(--swc-gray-800);background:transparent;border:none;border-radius:8px;transition:background .13s cubic-bezier(.45,0,.4,1)}.swc-MessageSources-toggle:hover{color:var(--swc-gray-800);background:var(--swc-gray-100)}.swc-MessageSources-chevron{transition:transform .13s ease}.swc-MessageSources-chevron--down{transform:rotate(90deg)}.swc-MessageSources-list{interpolate-size:allow-keywords;display:flex;visibility:hidden;flex-direction:column;gap:var(--swc-message-sources-list-gap, 4px);block-size:0;padding:0 8px;margin:0;overflow:hidden;list-style:none;counter-reset:sources;transition:block-size .16s cubic-bezier(.45,0,.4,1),visibility .16s linear}.swc-MessageSources-toggle[aria-expanded=true]+.swc-MessageSources-list{visibility:visible;block-size:auto}.swc-MessageSources-item{display:flex;gap:8px;align-items:center;font-size:var(--swc-font-size-100);font-weight:400;line-height:var(--swc-line-height-font-size-100);color:var(--swc-gray-800);list-style:none;counter-increment:sources}.swc-MessageSources-item:before{display:inline-flex;flex-shrink:0;align-items:center;justify-content:center;inline-size:var(--swc-message-sources-icon-inline-size, 16px);block-size:var(--swc-message-sources-icon-block-size, 20px);font-size:var(--swc-font-size-50);font-weight:700;color:var(--swc-gray-700);background:var(--swc-gray-100);border-radius:4px;content:counter(sources)}.swc-MessageSources-link{color:var(--swc-gray-800);text-underline-offset:2px}slot[hidden]{display:none}`;

// node_modules/lit-html/directive-helpers.js
var { I: t7 } = j;
var r8 = (o14) => void 0 === o14.strings;

// node_modules/lit-html/directive.js
var t8 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e13 = (t9) => (...e14) => ({ _$litDirective$: t9, values: e14 });
var i9 = class {
  constructor(t9) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t9, e14, i10) {
    this._$Ct = t9, this._$AM = e14, this._$Ci = i10;
  }
  _$AS(t9, e14) {
    return this.update(t9, e14);
  }
  update(t9, e14) {
    return this.render(...e14);
  }
};

// node_modules/lit-html/async-directive.js
var s5 = (i10, t9) => {
  const e14 = i10._$AN;
  if (void 0 === e14) return false;
  for (const i11 of e14) i11._$AO?.(t9, false), s5(i11, t9);
  return true;
};
var o12 = (i10) => {
  let t9, e14;
  do {
    if (void 0 === (t9 = i10._$AM)) break;
    e14 = t9._$AN, e14.delete(i10), i10 = t9;
  } while (0 === e14?.size);
};
var r9 = (i10) => {
  for (let t9; t9 = i10._$AM; i10 = t9) {
    let e14 = t9._$AN;
    if (void 0 === e14) t9._$AN = e14 = /* @__PURE__ */ new Set();
    else if (e14.has(i10)) break;
    e14.add(i10), c4(t9);
  }
};
function h3(i10) {
  void 0 !== this._$AN ? (o12(this), this._$AM = i10, r9(this)) : this._$AM = i10;
}
function n9(i10, t9 = false, e14 = 0) {
  const r10 = this._$AH, h4 = this._$AN;
  if (void 0 !== h4 && 0 !== h4.size) if (t9) if (Array.isArray(r10)) for (let i11 = e14; i11 < r10.length; i11++) s5(r10[i11], false), o12(r10[i11]);
  else null != r10 && (s5(r10, false), o12(r10));
  else s5(this, i10);
}
var c4 = (i10) => {
  i10.type == t8.CHILD && (i10._$AP ??= n9, i10._$AQ ??= h3);
};
var f3 = class extends i9 {
  constructor() {
    super(...arguments), this._$AN = void 0;
  }
  _$AT(i10, t9, e14) {
    super._$AT(i10, t9, e14), r9(this), this.isConnected = i10._$AU;
  }
  _$AO(i10, t9 = true) {
    i10 !== this.isConnected && (this.isConnected = i10, i10 ? this.reconnected?.() : this.disconnected?.()), t9 && (s5(this, i10), o12(this));
  }
  setValue(t9) {
    if (r8(this._$Ct)) this._$Ct._$AI(t9, this);
    else {
      const i10 = [...this._$Ct._$AH];
      i10[this._$Ci] = t9, this._$Ct._$AI(i10, this, 0);
    }
  }
  disconnected() {
  }
  reconnected() {
  }
};

// node_modules/lit-html/directives/ref.js
var o13 = /* @__PURE__ */ new WeakMap();
var n10 = e13(class extends f3 {
  render(i10) {
    return A;
  }
  update(i10, [s6]) {
    const e14 = s6 !== this.G;
    return e14 && void 0 !== this.G && this.rt(void 0), (e14 || this.lt !== this.ct) && (this.G = s6, this.ht = i10.options?.host, this.rt(this.ct = i10.element)), A;
  }
  rt(t9) {
    if (this.isConnected || (t9 = void 0), "function" == typeof this.G) {
      const i10 = this.ht ?? globalThis;
      let s6 = o13.get(i10);
      void 0 === s6 && (s6 = /* @__PURE__ */ new WeakMap(), o13.set(i10, s6)), void 0 !== s6.get(this.G) && this.G.call(this.ht, void 0), s6.set(this.G, t9), void 0 !== t9 && this.G.call(this.ht, t9);
    } else this.G.value = t9;
  }
  get lt() {
    return "function" == typeof this.G ? o13.get(this.ht ?? globalThis)?.get(this.G) : this.G?.value;
  }
  disconnected() {
    this.lt === this.ct && this.rt(void 0);
  }
  reconnected() {
    this.rt(this.ct);
  }
});

// deps/swc/swc-dist/patterns/conversational-ai/message-sources/MessageSources.js
var l3 = class extends o7 {
  constructor(...e14) {
    super(...e14), this.panelId = e12("swc-sources-panel"), this.toggleId = e12("swc-message-sources-toggle"), this.sourceLinks = [], this.open = false, this.label = "Sources", this.accessibleLabel = "";
  }
  static get styles() {
    return [t6];
  }
  _handleToggle() {
    this.open = !this.open, this.dispatchEvent(new CustomEvent("swc-message-sources-toggle", {
      bubbles: true,
      composed: true,
      detail: { open: this.open }
    }));
  }
  _handleSlotChange(e14) {
    this.sourceLinks = e14.target.assignedElements({ flatten: true }).filter((e15) => e15 instanceof HTMLAnchorElement).map((e15) => {
      var t9, n11, r10;
      let i10 = [];
      for (let t10 of Array.from(e15.attributes)) t10.name !== "href" && t10.name !== "class" && i10.push([t10.name, t10.value]);
      return {
        href: (t9 = e15.getAttribute("href")) == null ? "#" : t9,
        label: (n11 = (r10 = e15.textContent) == null ? void 0 : r10.trim()) == null ? "" : n11,
        extraAttributes: i10
      };
    });
  }
  render() {
    let e14 = this.open, n11 = this.label.trim() || "Sources", r10 = this.accessibleLabel.trim().length > 0 ? this.accessibleLabel.trim() : n11;
    return b2`
      <div class="swc-MessageSources">
        <button
          id=${this.toggleId}
          class="swc-MessageSources-toggle"
          aria-label=${r10}
          aria-expanded=${e14}
          aria-controls=${this.panelId}
          @click=${this._handleToggle}
        >
          <swc-icon
            class=${e14 ? "swc-MessageSources-chevron swc-MessageSources-chevron--down" : "swc-MessageSources-chevron"}
            style="--swc-icon-inline-size:10px;--swc-icon-block-size:10px;"
            aria-hidden="true"
          >
            ${t3()}
          </swc-icon>
          ${n11}
        </button>

        <ol
          id=${this.panelId}
          class="swc-MessageSources-list"
          aria-labelledby=${this.toggleId}
          ?hidden=${!e14}
        >
          ${this.sourceLinks.map((e15) => b2`
              <li class="swc-MessageSources-item">
                <a
                  class="swc-MessageSources-link"
                  href=${e15.href}
                  ${n10((t9) => {
      if (t9 instanceof HTMLAnchorElement) for (let [n12, r11] of e15.extraAttributes) t9.setAttribute(n12, r11);
    })}
                >
                  ${e15.label}
                </a>
              </li>
            `)}
        </ol>
        <slot hidden @slotchange=${this._handleSlotChange}></slot>
      </div>
    `;
  }
};
e([r5()], l3.prototype, "sourceLinks", void 0), e([n4({
  type: Boolean,
  reflect: true
})], l3.prototype, "open", void 0), e([n4({ type: String })], l3.prototype, "label", void 0), e([n4({
  type: String,
  attribute: "accessible-label"
})], l3.prototype, "accessibleLabel", void 0);

// deps/swc/swc-dist/patterns/conversational-ai/message-sources/index.js
e8("swc-message-sources", l3);
export {
  l3 as MessageSources
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
lit-html/async-directive.js:
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

lit-html/directive-helpers.js:
lit-html/directives/ref.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
