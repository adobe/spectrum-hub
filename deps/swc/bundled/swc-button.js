// deps/swc/swc-dist/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e(e14, t10, n10, r9) {
  var i10 = arguments.length, a6 = i10 < 3 ? t10 : r9 === null ? r9 = Object.getOwnPropertyDescriptor(t10, n10) : r9, o11;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a6 = Reflect.decorate(e14, t10, n10, r9);
  else for (var s5 = e14.length - 1; s5 >= 0; s5--) (o11 = e14[s5]) && (a6 = (i10 < 3 ? o11(a6) : i10 > 3 ? o11(t10, n10, a6) : o11(t10, n10)) || a6);
  return i10 > 3 && a6 && Object.defineProperty(t10, n10, a6), a6;
}

// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e2 = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t10, e14, o11) {
    if (this._$cssResult$ = true, o11 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t10, this.t = e14;
  }
  get styleSheet() {
    let t10 = this.o;
    const s5 = this.t;
    if (e2 && void 0 === t10) {
      const e14 = void 0 !== s5 && 1 === s5.length;
      e14 && (t10 = o.get(s5)), void 0 === t10 && ((this.o = t10 = new CSSStyleSheet()).replaceSync(this.cssText), e14 && o.set(s5, t10));
    }
    return t10;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t10) => new n("string" == typeof t10 ? t10 : t10 + "", void 0, s);
var i = (t10, ...e14) => {
  const o11 = 1 === t10.length ? t10[0] : e14.reduce((e15, s5, o12) => e15 + ((t11) => {
    if (true === t11._$cssResult$) return t11.cssText;
    if ("number" == typeof t11) return t11;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t11 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t10[o12 + 1], t10[0]);
  return new n(o11, t10, s);
};
var S = (s5, o11) => {
  if (e2) s5.adoptedStyleSheets = o11.map((t10) => t10 instanceof CSSStyleSheet ? t10 : t10.styleSheet);
  else for (const e14 of o11) {
    const o12 = document.createElement("style"), n10 = t.litNonce;
    void 0 !== n10 && o12.setAttribute("nonce", n10), o12.textContent = e14.cssText, s5.appendChild(o12);
  }
};
var c = e2 ? (t10) => t10 : (t10) => t10 instanceof CSSStyleSheet ? ((t11) => {
  let e14 = "";
  for (const s5 of t11.cssRules) e14 += s5.cssText;
  return r(e14);
})(t10) : t10;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e3, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t10, s5) => t10;
var u = { toAttribute(t10, s5) {
  switch (s5) {
    case Boolean:
      t10 = t10 ? l : null;
      break;
    case Object:
    case Array:
      t10 = null == t10 ? t10 : JSON.stringify(t10);
  }
  return t10;
}, fromAttribute(t10, s5) {
  let i10 = t10;
  switch (s5) {
    case Boolean:
      i10 = null !== t10;
      break;
    case Number:
      i10 = null === t10 ? null : Number(t10);
      break;
    case Object:
    case Array:
      try {
        i10 = JSON.parse(t10);
      } catch (t11) {
        i10 = null;
      }
  }
  return i10;
} };
var f = (t10, s5) => !i2(t10, s5);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t10) {
    this._$Ei(), (this.l ??= []).push(t10);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t10, s5 = b) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t10) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t10, s5), !s5.noAccessor) {
      const i10 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t10, i10, s5);
      void 0 !== h3 && e3(this.prototype, t10, h3);
    }
  }
  static getPropertyDescriptor(t10, s5, i10) {
    const { get: e14, set: r9 } = h(this.prototype, t10) ?? { get() {
      return this[s5];
    }, set(t11) {
      this[s5] = t11;
    } };
    return { get: e14, set(s6) {
      const h3 = e14?.call(this);
      r9?.call(this, s6), this.requestUpdate(t10, h3, i10);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t10) {
    return this.elementProperties.get(t10) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t10 = n2(this);
    t10.finalize(), void 0 !== t10.l && (this.l = [...t10.l]), this.elementProperties = new Map(t10.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t11 = this.properties, s5 = [...r2(t11), ...o2(t11)];
      for (const i10 of s5) this.createProperty(i10, t11[i10]);
    }
    const t10 = this[Symbol.metadata];
    if (null !== t10) {
      const s5 = litPropertyMetadata.get(t10);
      if (void 0 !== s5) for (const [t11, i10] of s5) this.elementProperties.set(t11, i10);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t11, s5] of this.elementProperties) {
      const i10 = this._$Eu(t11, s5);
      void 0 !== i10 && this._$Eh.set(i10, t11);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s5) {
    const i10 = [];
    if (Array.isArray(s5)) {
      const e14 = new Set(s5.flat(1 / 0).reverse());
      for (const s6 of e14) i10.unshift(c(s6));
    } else void 0 !== s5 && i10.push(c(s5));
    return i10;
  }
  static _$Eu(t10, s5) {
    const i10 = s5.attribute;
    return false === i10 ? void 0 : "string" == typeof i10 ? i10 : "string" == typeof t10 ? t10.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t10) => this.enableUpdating = t10), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t10) => t10(this));
  }
  addController(t10) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t10), void 0 !== this.renderRoot && this.isConnected && t10.hostConnected?.();
  }
  removeController(t10) {
    this._$EO?.delete(t10);
  }
  _$E_() {
    const t10 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i10 of s5.keys()) this.hasOwnProperty(i10) && (t10.set(i10, this[i10]), delete this[i10]);
    t10.size > 0 && (this._$Ep = t10);
  }
  createRenderRoot() {
    const t10 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t10, this.constructor.elementStyles), t10;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t10) => t10.hostConnected?.());
  }
  enableUpdating(t10) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t10) => t10.hostDisconnected?.());
  }
  attributeChangedCallback(t10, s5, i10) {
    this._$AK(t10, i10);
  }
  _$ET(t10, s5) {
    const i10 = this.constructor.elementProperties.get(t10), e14 = this.constructor._$Eu(t10, i10);
    if (void 0 !== e14 && true === i10.reflect) {
      const h3 = (void 0 !== i10.converter?.toAttribute ? i10.converter : u).toAttribute(s5, i10.type);
      this._$Em = t10, null == h3 ? this.removeAttribute(e14) : this.setAttribute(e14, h3), this._$Em = null;
    }
  }
  _$AK(t10, s5) {
    const i10 = this.constructor, e14 = i10._$Eh.get(t10);
    if (void 0 !== e14 && this._$Em !== e14) {
      const t11 = i10.getPropertyOptions(e14), h3 = "function" == typeof t11.converter ? { fromAttribute: t11.converter } : void 0 !== t11.converter?.fromAttribute ? t11.converter : u;
      this._$Em = e14;
      const r9 = h3.fromAttribute(s5, t11.type);
      this[e14] = r9 ?? this._$Ej?.get(e14) ?? r9, this._$Em = null;
    }
  }
  requestUpdate(t10, s5, i10, e14 = false, h3) {
    if (void 0 !== t10) {
      const r9 = this.constructor;
      if (false === e14 && (h3 = this[t10]), i10 ??= r9.getPropertyOptions(t10), !((i10.hasChanged ?? f)(h3, s5) || i10.useDefault && i10.reflect && h3 === this._$Ej?.get(t10) && !this.hasAttribute(r9._$Eu(t10, i10)))) return;
      this.C(t10, s5, i10);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t10, s5, { useDefault: i10, reflect: e14, wrapped: h3 }, r9) {
    i10 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t10) && (this._$Ej.set(t10, r9 ?? s5 ?? this[t10]), true !== h3 || void 0 !== r9) || (this._$AL.has(t10) || (this.hasUpdated || i10 || (s5 = void 0), this._$AL.set(t10, s5)), true === e14 && this._$Em !== t10 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t10));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t11) {
      Promise.reject(t11);
    }
    const t10 = this.scheduleUpdate();
    return null != t10 && await t10, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t12, s6] of this._$Ep) this[t12] = s6;
        this._$Ep = void 0;
      }
      const t11 = this.constructor.elementProperties;
      if (t11.size > 0) for (const [s6, i10] of t11) {
        const { wrapped: t12 } = i10, e14 = this[s6];
        true !== t12 || this._$AL.has(s6) || void 0 === e14 || this.C(s6, void 0, i10, e14);
      }
    }
    let t10 = false;
    const s5 = this._$AL;
    try {
      t10 = this.shouldUpdate(s5), t10 ? (this.willUpdate(s5), this._$EO?.forEach((t11) => t11.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t10 = false, this._$EM(), s6;
    }
    t10 && this._$AE(s5);
  }
  willUpdate(t10) {
  }
  _$AE(t10) {
    this._$EO?.forEach((t11) => t11.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t10)), this.updated(t10);
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
  shouldUpdate(t10) {
    return true;
  }
  update(t10) {
    this._$Eq &&= this._$Eq.forEach((t11) => this._$ET(t11, this[t11])), this._$EM();
  }
  updated(t10) {
  }
  firstUpdated(t10) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t10) => t10;
var s2 = t2.trustedTypes;
var e4 = s2 ? s2.createPolicy("lit-html", { createHTML: (t10) => t10 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t10) => null === t10 || "object" != typeof t10 && "function" != typeof t10;
var u2 = Array.isArray;
var d2 = (t10) => u2(t10) || "function" == typeof t10?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t10) => (i10, ...s5) => ({ _$litType$: t10, strings: i10, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t10, i10) {
  if (!u2(t10) || !t10.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e4 ? e4.createHTML(i10) : i10;
}
var N = (t10, i10) => {
  const s5 = t10.length - 1, e14 = [];
  let n10, l4 = 2 === i10 ? "<svg>" : 3 === i10 ? "<math>" : "", c5 = v;
  for (let i11 = 0; i11 < s5; i11++) {
    const s6 = t10[i11];
    let a6, u3, d4 = -1, f4 = 0;
    for (; f4 < s6.length && (c5.lastIndex = f4, u3 = c5.exec(s6), null !== u3); ) f4 = c5.lastIndex, c5 === v ? "!--" === u3[1] ? c5 = _ : void 0 !== u3[1] ? c5 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n10 = RegExp("</" + u3[2], "g")), c5 = p2) : void 0 !== u3[3] && (c5 = p2) : c5 === p2 ? ">" === u3[0] ? (c5 = n10 ?? v, d4 = -1) : void 0 === u3[1] ? d4 = -2 : (d4 = c5.lastIndex - u3[2].length, a6 = u3[1], c5 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c5 === $ || c5 === g ? c5 = p2 : c5 === _ || c5 === m ? c5 = v : (c5 = p2, n10 = void 0);
    const x2 = c5 === p2 && t10[i11 + 1].startsWith("/>") ? " " : "";
    l4 += c5 === v ? s6 + r3 : d4 >= 0 ? (e14.push(a6), s6.slice(0, d4) + h2 + s6.slice(d4) + o3 + x2) : s6 + o3 + (-2 === d4 ? i11 : x2);
  }
  return [V(t10, l4 + (t10[s5] || "<?>") + (2 === i10 ? "</svg>" : 3 === i10 ? "</math>" : "")), e14];
};
var S2 = class _S {
  constructor({ strings: t10, _$litType$: i10 }, e14) {
    let r9;
    this.parts = [];
    let l4 = 0, a6 = 0;
    const u3 = t10.length - 1, d4 = this.parts, [f4, v2] = N(t10, i10);
    if (this.el = _S.createElement(f4, e14), P.currentNode = this.el.content, 2 === i10 || 3 === i10) {
      const t11 = this.el.content.firstChild;
      t11.replaceWith(...t11.childNodes);
    }
    for (; null !== (r9 = P.nextNode()) && d4.length < u3; ) {
      if (1 === r9.nodeType) {
        if (r9.hasAttributes()) for (const t11 of r9.getAttributeNames()) if (t11.endsWith(h2)) {
          const i11 = v2[a6++], s5 = r9.getAttribute(t11).split(o3), e15 = /([.?@])?(.*)/.exec(i11);
          d4.push({ type: 1, index: l4, name: e15[2], strings: s5, ctor: "." === e15[1] ? I : "?" === e15[1] ? L : "@" === e15[1] ? z : H }), r9.removeAttribute(t11);
        } else t11.startsWith(o3) && (d4.push({ type: 6, index: l4 }), r9.removeAttribute(t11));
        if (y2.test(r9.tagName)) {
          const t11 = r9.textContent.split(o3), i11 = t11.length - 1;
          if (i11 > 0) {
            r9.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i11; s5++) r9.append(t11[s5], c3()), P.nextNode(), d4.push({ type: 2, index: ++l4 });
            r9.append(t11[i11], c3());
          }
        }
      } else if (8 === r9.nodeType) if (r9.data === n3) d4.push({ type: 2, index: l4 });
      else {
        let t11 = -1;
        for (; -1 !== (t11 = r9.data.indexOf(o3, t11 + 1)); ) d4.push({ type: 7, index: l4 }), t11 += o3.length - 1;
      }
      l4++;
    }
  }
  static createElement(t10, i10) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t10, s5;
  }
};
function M(t10, i10, s5 = t10, e14) {
  if (i10 === E) return i10;
  let h3 = void 0 !== e14 ? s5._$Co?.[e14] : s5._$Cl;
  const o11 = a2(i10) ? void 0 : i10._$litDirective$;
  return h3?.constructor !== o11 && (h3?._$AO?.(false), void 0 === o11 ? h3 = void 0 : (h3 = new o11(t10), h3._$AT(t10, s5, e14)), void 0 !== e14 ? (s5._$Co ??= [])[e14] = h3 : s5._$Cl = h3), void 0 !== h3 && (i10 = M(t10, h3._$AS(t10, i10.values), h3, e14)), i10;
}
var R = class {
  constructor(t10, i10) {
    this._$AV = [], this._$AN = void 0, this._$AD = t10, this._$AM = i10;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t10) {
    const { el: { content: i10 }, parts: s5 } = this._$AD, e14 = (t10?.creationScope ?? l2).importNode(i10, true);
    P.currentNode = e14;
    let h3 = P.nextNode(), o11 = 0, n10 = 0, r9 = s5[0];
    for (; void 0 !== r9; ) {
      if (o11 === r9.index) {
        let i11;
        2 === r9.type ? i11 = new k(h3, h3.nextSibling, this, t10) : 1 === r9.type ? i11 = new r9.ctor(h3, r9.name, r9.strings, this, t10) : 6 === r9.type && (i11 = new Z(h3, this, t10)), this._$AV.push(i11), r9 = s5[++n10];
      }
      o11 !== r9?.index && (h3 = P.nextNode(), o11++);
    }
    return P.currentNode = l2, e14;
  }
  p(t10) {
    let i10 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t10, s5, i10), i10 += s5.strings.length - 2) : s5._$AI(t10[i10])), i10++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t10, i10, s5, e14) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t10, this._$AB = i10, this._$AM = s5, this.options = e14, this._$Cv = e14?.isConnected ?? true;
  }
  get parentNode() {
    let t10 = this._$AA.parentNode;
    const i10 = this._$AM;
    return void 0 !== i10 && 11 === t10?.nodeType && (t10 = i10.parentNode), t10;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t10, i10 = this) {
    t10 = M(this, t10, i10), a2(t10) ? t10 === A || null == t10 || "" === t10 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t10 !== this._$AH && t10 !== E && this._(t10) : void 0 !== t10._$litType$ ? this.$(t10) : void 0 !== t10.nodeType ? this.T(t10) : d2(t10) ? this.k(t10) : this._(t10);
  }
  O(t10) {
    return this._$AA.parentNode.insertBefore(t10, this._$AB);
  }
  T(t10) {
    this._$AH !== t10 && (this._$AR(), this._$AH = this.O(t10));
  }
  _(t10) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t10 : this.T(l2.createTextNode(t10)), this._$AH = t10;
  }
  $(t10) {
    const { values: i10, _$litType$: s5 } = t10, e14 = "number" == typeof s5 ? this._$AC(t10) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e14) this._$AH.p(i10);
    else {
      const t11 = new R(e14, this), s6 = t11.u(this.options);
      t11.p(i10), this.T(s6), this._$AH = t11;
    }
  }
  _$AC(t10) {
    let i10 = C.get(t10.strings);
    return void 0 === i10 && C.set(t10.strings, i10 = new S2(t10)), i10;
  }
  k(t10) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i10 = this._$AH;
    let s5, e14 = 0;
    for (const h3 of t10) e14 === i10.length ? i10.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i10[e14], s5._$AI(h3), e14++;
    e14 < i10.length && (this._$AR(s5 && s5._$AB.nextSibling, e14), i10.length = e14);
  }
  _$AR(t10 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t10 !== this._$AB; ) {
      const s6 = i3(t10).nextSibling;
      i3(t10).remove(), t10 = s6;
    }
  }
  setConnected(t10) {
    void 0 === this._$AM && (this._$Cv = t10, this._$AP?.(t10));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t10, i10, s5, e14, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t10, this.name = i10, this._$AM = e14, this.options = h3, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t10, i10 = this, s5, e14) {
    const h3 = this.strings;
    let o11 = false;
    if (void 0 === h3) t10 = M(this, t10, i10, 0), o11 = !a2(t10) || t10 !== this._$AH && t10 !== E, o11 && (this._$AH = t10);
    else {
      const e15 = t10;
      let n10, r9;
      for (t10 = h3[0], n10 = 0; n10 < h3.length - 1; n10++) r9 = M(this, e15[s5 + n10], i10, n10), r9 === E && (r9 = this._$AH[n10]), o11 ||= !a2(r9) || r9 !== this._$AH[n10], r9 === A ? t10 = A : t10 !== A && (t10 += (r9 ?? "") + h3[n10 + 1]), this._$AH[n10] = r9;
    }
    o11 && !e14 && this.j(t10);
  }
  j(t10) {
    t10 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t10 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t10) {
    this.element[this.name] = t10 === A ? void 0 : t10;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t10) {
    this.element.toggleAttribute(this.name, !!t10 && t10 !== A);
  }
};
var z = class extends H {
  constructor(t10, i10, s5, e14, h3) {
    super(t10, i10, s5, e14, h3), this.type = 5;
  }
  _$AI(t10, i10 = this) {
    if ((t10 = M(this, t10, i10, 0) ?? A) === E) return;
    const s5 = this._$AH, e14 = t10 === A && s5 !== A || t10.capture !== s5.capture || t10.once !== s5.once || t10.passive !== s5.passive, h3 = t10 !== A && (s5 === A || e14);
    e14 && this.element.removeEventListener(this.name, this, s5), h3 && this.element.addEventListener(this.name, this, t10), this._$AH = t10;
  }
  handleEvent(t10) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t10) : this._$AH.handleEvent(t10);
  }
};
var Z = class {
  constructor(t10, i10, s5) {
    this.element = t10, this.type = 6, this._$AN = void 0, this._$AM = i10, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t10) {
    M(this, t10);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.2");
var D = (t10, i10, s5) => {
  const e14 = s5?.renderBefore ?? i10;
  let h3 = e14._$litPart$;
  if (void 0 === h3) {
    const t11 = s5?.renderBefore ?? null;
    e14._$litPart$ = h3 = new k(i10.insertBefore(c3(), t11), t11, void 0, s5 ?? {});
  }
  return h3._$AI(t10), h3;
};

// node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t10 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t10.firstChild, t10;
  }
  update(t10) {
    const r9 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t10), this._$Do = D(r9, this.renderRoot, this.renderOptions);
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

// node_modules/lit-html/directive.js
var t3 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e5 = (t10) => (...e14) => ({ _$litDirective$: t10, values: e14 });
var i5 = class {
  constructor(t10) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t10, e14, i10) {
    this._$Ct = t10, this._$AM = e14, this._$Ci = i10;
  }
  _$AS(t10, e14) {
    return this.update(t10, e14);
  }
  update(t10, e14) {
    return this.render(...e14);
  }
};

// node_modules/lit-html/directives/class-map.js
var e6 = e5(class extends i5 {
  constructor(t10) {
    if (super(t10), t10.type !== t3.ATTRIBUTE || "class" !== t10.name || t10.strings?.length > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
  }
  render(t10) {
    return " " + Object.keys(t10).filter((s5) => t10[s5]).join(" ") + " ";
  }
  update(s5, [i10]) {
    if (void 0 === this.st) {
      this.st = /* @__PURE__ */ new Set(), void 0 !== s5.strings && (this.nt = new Set(s5.strings.join(" ").split(/\s/).filter((t10) => "" !== t10)));
      for (const t10 in i10) i10[t10] && !this.nt?.has(t10) && this.st.add(t10);
      return this.render(i10);
    }
    const r9 = s5.element.classList;
    for (const t10 of this.st) t10 in i10 || (r9.remove(t10), this.st.delete(t10));
    for (const t10 in i10) {
      const s6 = !!i10[t10];
      s6 === this.st.has(t10) || this.nt?.has(t10) || (s6 ? (r9.add(t10), this.st.add(t10)) : (r9.remove(t10), this.st.delete(t10)));
    }
    return E;
  }
});

// deps/swc/swc-dist/components/button/pending-spinner.js
function r4(r9, i10) {
  return r9 ? b2`
    <svg
      class=${e6({
    "swc-PendingSpinner": true,
    "swc-PendingSpinner--active": i10
  })}
      width="100%"
      height="100%"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        class="swc-PendingSpinner-track"
        cx="50%"
        cy="50%"
        r="calc(50% - 1px)"
      />
      <circle
        class="swc-PendingSpinner-fill"
        cx="50%"
        cy="50%"
        r="calc(50% - 1px)"
        pathLength="100"
        stroke-dasharray="100 200"
        stroke-dashoffset="75"
        stroke-linecap="round"
      />
    </svg>
  ` : A;
}

// deps/swc/swc-dist/stylesheets/_lit-styles/pending-spinner.js
var t4 = i`@keyframes swc-pending-spinner-rotate{0%{transform:rotate(var(--swc-pending-spinner-rotate-start, -90deg))}to{transform:rotate(var(--swc-pending-spinner-rotate-end, 270deg))}}@keyframes swc-pending-spinner-dashoffset{0%,to{stroke-dashoffset:75px}30%{stroke-dashoffset:var(--swc-pending-spinner-dashoffset-30, 20px)}}.swc-PendingSpinner{--_swc-pending-spinner-track-border-color: var(--swc-gray-300);--_swc-pending-spinner-fill-border-color: var(--swc-accent-color-900);--_swc-pending-spinner-thickness: 2px;display:none}.swc-PendingSpinner--active{display:inline-block}.swc-PendingSpinner-track,.swc-PendingSpinner-fill{inline-size:var(--_swc-pending-spinner-size);block-size:var(--_swc-pending-spinner-size)}.swc-PendingSpinner-track{stroke:var(--_swc-pending-spinner-track-border-color);stroke-width:var(--_swc-pending-spinner-thickness)}.swc-PendingSpinner-fill{stroke:var(--_swc-pending-spinner-fill-border-color);stroke-width:var(--_swc-pending-spinner-thickness);transform:rotate(-90deg);transform-origin:center}.swc-PendingSpinner--active .swc-PendingSpinner-fill{animation:swc-pending-spinner-rotate 1s cubic-bezier(.6,.1,.3,.9) infinite,swc-pending-spinner-dashoffset 1s cubic-bezier(.25,.1,.25,1.3) infinite;will-change:transform}:host([static-color=\"white\"]) .swc-PendingSpinner{--_swc-pending-spinner-track-border-color: var(--swc-transparent-white-300);--_swc-pending-spinner-fill-border-color: var(--swc-transparent-white-900)}:host([static-color=\"black\"]) .swc-PendingSpinner{--_swc-pending-spinner-track-border-color: var(--swc-transparent-black-300);--_swc-pending-spinner-fill-border-color: var(--swc-transparent-black-900)}@media(prefers-reduced-motion:reduce){.swc-PendingSpinner--active .swc-PendingSpinner-fill{--swc-pending-spinner-dashoffset-30: 0;--swc-pending-spinner-rotate-start: 0deg;--swc-pending-spinner-rotate-end: 360deg;animation-duration:15s;animation-timing-function:linear,linear}}@media(forced-colors:active){.swc-PendingSpinner-track{@media(prefers-color-scheme:dark){--_swc-pending-spinner-track-border-color: var(--swc-transparent-white-300)}@media(prefers-color-scheme:light){--_swc-pending-spinner-track-border-color: var(--swc-transparent-black-300)}}.swc-PendingSpinner-fill{--_swc-pending-spinner-fill-border-color: Highlight}}`;

// deps/swc/swc-dist/components/button/button.js
var t5 = i`.swc-Button{--_swc-button-border-width: 2px;--_swc-button-min-block-size: var(--swc-button-min-block-size, var(--swc-component-height-100));gap:var(--swc-button-gap, 6px);max-inline-size:var(--swc-button-max-inline-size, inherit);min-block-size:var(--_swc-button-min-block-size);padding-block:calc(var(--swc-button-padding-vertical, 7px) - var(--_swc-button-border-width));padding-inline:calc(var(--swc-button-edge-to-text, var(--swc-base-padding-horizontal-medium)) - var(--_swc-button-border-width));font-family:var(--swc-sans-font-family-stack);font-size:var(--swc-button-font-size, var(--swc-font-size-100));font-weight:700;line-height:round(down,1.3em,1px);color:var(--swc-button-content-color-default, var(--swc-gray-25));background-color:var(--swc-button-background-color-default, var(--swc-gray-800));border-color:var(--swc-button-border-color-default, transparent);border-width:var(--_swc-button-border-width);border-radius:var(--swc-button-border-radius, calc(var(--_swc-button-min-block-size) / 2));transition-timing-function:cubic-bezier(.45,0,.4,1);transition-duration:.13s;transition-property:outline,border-color,color,background-color,transform}.swc-Button:hover{color:var(--swc-button-content-color-hover, var(--swc-gray-25));background-color:var(--swc-button-background-color-hover, var(--swc-gray-900));border-color:var(--swc-button-border-color-hover, transparent)}.swc-Button:focus-visible{color:var(--swc-button-content-color-focus, var(--swc-gray-25));background-color:var(--swc-button-background-color-focus, var(--swc-gray-900));border-color:var(--swc-button-border-color-focus, transparent)}.swc-Button:active{color:var(--swc-button-content-color-down, var(--swc-gray-25));background-color:var(--swc-button-background-color-down, var(--swc-gray-900));border-color:var(--swc-button-border-color-down, transparent);transform:var(--swc-button-down-state-transform, perspective(var(--_swc-button-min-block-size)) translate3d(0, 0, -2px));will-change:transform}.swc-Button-label{text-align:center}.swc-Button--hasIcon .swc-Button-label{text-align:start}slot[name=icon]::slotted(*),.swc-PendingSpinner{--_swc-button-icon-size: var(--swc-button-icon-size, var(--swc-workflow-icon-medium));--_swc-button-icon-block-size: var(--swc-button-icon-block-size, var(--_swc-button-icon-size));--_swc-pending-spinner-size: var(--_swc-button-icon-size);flex-shrink:0;align-self:flex-start;inline-size:var(--swc-button-icon-inline-size, var(--_swc-button-icon-size));block-size:var(--_swc-button-icon-block-size);margin-block:calc((var(--_swc-button-icon-block-size) - 1lh) / 2 * -1);margin-inline-start:calc(var(--swc-button-edge-to-visual, var(--swc-base-padding-horizontal-medium)) - var(--swc-button-edge-to-text, var(--swc-base-padding-horizontal-medium)))}slot[name=icon]::slotted(*){color:inherit;fill:currentcolor}:host([size=\"s\"]){--swc-button-min-block-size: var(--swc-component-height-75);--swc-button-font-size: var(--swc-font-size-75);--swc-button-gap: 4px;--swc-button-edge-to-text: var(--swc-base-padding-horizontal-small);--swc-button-edge-to-visual: var(--swc-base-padding-horizontal-small);--swc-button-edge-to-visual-only: 5px;--swc-button-padding-vertical: 5px;--swc-button-icon-size: var(--swc-workflow-icon-small)}:host([size=\"l\"]){--swc-button-min-block-size: var(--swc-component-height-200);--swc-button-font-size: var(--swc-font-size-200);--swc-button-gap: 6px;--swc-button-edge-to-text: var(--swc-base-padding-horizontal-large);--swc-button-edge-to-visual: var(--swc-base-padding-horizontal-large);--swc-button-edge-to-visual-only: 7px;--swc-button-padding-vertical: 10px;--swc-button-icon-size: var(--swc-workflow-icon-large)}:host([size=\"xl\"]){--swc-button-min-block-size: var(--swc-component-height-300);--swc-button-font-size: var(--swc-font-size-300);--swc-button-gap: 6px;--swc-button-edge-to-text: var(--swc-base-padding-horizontal-extra-large);--swc-button-edge-to-visual: var(--swc-base-padding-horizontal-extra-large);--swc-button-edge-to-visual-only: 9px;--swc-button-padding-vertical: 13px;--swc-button-icon-size: var(--swc-workflow-icon-extra-large)}:host([variant=\"accent\"]){--swc-button-content-color-default: rgb(255, 255, 255);--swc-button-content-color-hover: rgb(255, 255, 255);--swc-button-content-color-down: rgb(255, 255, 255);--swc-button-content-color-focus: rgb(255, 255, 255);--swc-button-background-color-default: var(--swc-accent-background-color-default);--swc-button-background-color-hover: var(--swc-accent-background-color-hover);--swc-button-background-color-down: var(--swc-accent-background-color-down);--swc-button-background-color-focus: var(--swc-accent-background-color-key-focus)}:host([variant=\"negative\"]){--swc-button-content-color-default: rgb(255, 255, 255);--swc-button-content-color-hover: rgb(255, 255, 255);--swc-button-content-color-down: rgb(255, 255, 255);--swc-button-content-color-focus: rgb(255, 255, 255);--swc-button-background-color-default: var(--swc-negative-background-color-default);--swc-button-background-color-hover: var(--swc-negative-background-color-hover);--swc-button-background-color-down: var(--swc-negative-background-color-down);--swc-button-background-color-focus: var(--swc-negative-background-color-key-focus)}:host([variant=\"secondary\"]){--swc-button-content-color-default: var(--swc-gray-800);--swc-button-content-color-hover: var(--swc-gray-900);--swc-button-content-color-down: var(--swc-gray-900);--swc-button-content-color-focus: var(--swc-gray-900);--swc-button-background-color-default: var(--swc-gray-100);--swc-button-background-color-hover: var(--swc-gray-200);--swc-button-background-color-down: var(--swc-gray-200);--swc-button-background-color-focus: var(--swc-gray-200)}:host([variant=\"primary\"][fill-style=\"outline\"]){--swc-button-background-color-default: transparent;--swc-button-background-color-hover: var(--swc-gray-100);--swc-button-background-color-down: var(--swc-gray-100);--swc-button-background-color-focus: var(--swc-gray-100);--swc-button-border-color-default: var(--swc-gray-800);--swc-button-border-color-hover: var(--swc-gray-900);--swc-button-border-color-down: var(--swc-gray-900);--swc-button-border-color-focus: var(--swc-gray-900);--swc-button-content-color-default: var(--swc-gray-800);--swc-button-content-color-hover: var(--swc-gray-900);--swc-button-content-color-down: var(--swc-gray-900);--swc-button-content-color-focus: var(--swc-gray-900);--swc-button-background-color-disabled: transparent;--swc-button-border-color-disabled: var(--swc-gray-300)}:host([variant=\"secondary\"][fill-style=\"outline\"]){--swc-button-background-color-default: transparent;--swc-button-background-color-hover: var(--swc-gray-100);--swc-button-background-color-down: var(--swc-gray-100);--swc-button-background-color-focus: var(--swc-gray-100);--swc-button-border-color-default: var(--swc-gray-300);--swc-button-border-color-hover: var(--swc-gray-400);--swc-button-border-color-down: var(--swc-gray-400);--swc-button-border-color-focus: var(--swc-gray-400);--swc-button-background-color-disabled: transparent;--swc-button-border-color-disabled: var(--swc-gray-300)}:host([static-color=\"white\"]){--swc-button-focus-indicator-color: var(--swc-white);--swc-button-background-color-default: rgba(255, 255, 255, .85);--swc-button-background-color-hover: rgba(255, 255, 255, .94);--swc-button-background-color-down: rgba(255, 255, 255, .94);--swc-button-background-color-focus: rgba(255, 255, 255, .94);--swc-button-content-color-default: rgb(0, 0, 0);--swc-button-content-color-hover: rgb(0, 0, 0);--swc-button-content-color-down: rgb(0, 0, 0);--swc-button-content-color-focus: rgb(0, 0, 0);--swc-button-background-color-disabled: var(--swc-transparent-white-100);--swc-button-border-color-disabled: transparent;--swc-button-content-color-disabled: var(--swc-transparent-white-400)}:host([static-color=\"white\"][variant=\"secondary\"]){--swc-button-background-color-default: rgba(255, 255, 255, .11);--swc-button-background-color-hover: rgba(255, 255, 255, .14);--swc-button-background-color-down: rgba(255, 255, 255, .14);--swc-button-background-color-focus: rgba(255, 255, 255, .14);--swc-button-content-color-default: rgba(255, 255, 255, .85);--swc-button-content-color-hover: rgba(255, 255, 255, .94);--swc-button-content-color-down: rgba(255, 255, 255, .94);--swc-button-content-color-focus: rgba(255, 255, 255, .94)}:host([static-color=\"white\"][fill-style=\"outline\"]){--swc-button-background-color-default: rgba(255, 255, 255, 0);--swc-button-background-color-hover: rgba(255, 255, 255, .11);--swc-button-background-color-down: rgba(255, 255, 255, .11);--swc-button-background-color-focus: rgba(255, 255, 255, .11);--swc-button-border-color-default: rgba(255, 255, 255, .85);--swc-button-border-color-hover: rgba(255, 255, 255, .94);--swc-button-border-color-down: rgba(255, 255, 255, .94);--swc-button-border-color-focus: rgba(255, 255, 255, .94);--swc-button-content-color-default: rgba(255, 255, 255, .85);--swc-button-content-color-hover: rgba(255, 255, 255, .94);--swc-button-content-color-down: rgba(255, 255, 255, .94);--swc-button-content-color-focus: rgba(255, 255, 255, .94);--swc-button-background-color-disabled: rgba(255, 255, 255, 0);--swc-button-border-color-disabled: var(--swc-transparent-white-300);--swc-button-content-color-disabled: var(--swc-transparent-white-400)}:host([static-color=\"white\"][variant=\"secondary\"][fill-style=\"outline\"]){--swc-button-background-color-default: rgba(255, 255, 255, 0);--swc-button-background-color-hover: rgba(255, 255, 255, .11);--swc-button-background-color-down: rgba(255, 255, 255, .11);--swc-button-background-color-focus: rgba(255, 255, 255, .11);--swc-button-border-color-default: rgba(255, 255, 255, .17);--swc-button-border-color-hover: rgba(255, 255, 255, .21);--swc-button-border-color-down: rgba(255, 255, 255, .21);--swc-button-border-color-focus: rgba(255, 255, 255, .21)}:host([static-color=\"black\"]){--swc-button-focus-indicator-color: var(--swc-black);--swc-button-background-color-default: rgba(0, 0, 0, .84);--swc-button-background-color-hover: rgba(0, 0, 0, .93);--swc-button-background-color-down: rgba(0, 0, 0, .93);--swc-button-background-color-focus: rgba(0, 0, 0, .93);--swc-button-content-color-default: rgb(255, 255, 255);--swc-button-content-color-hover: rgb(255, 255, 255);--swc-button-content-color-down: rgb(255, 255, 255);--swc-button-content-color-focus: rgb(255, 255, 255);--swc-button-background-color-disabled: var(--swc-transparent-black-100);--swc-button-border-color-disabled: transparent;--swc-button-content-color-disabled: var(--swc-transparent-black-400)}:host([static-color=\"black\"][variant=\"secondary\"]){--swc-button-background-color-default: rgba(0, 0, 0, .09);--swc-button-background-color-hover: rgba(0, 0, 0, .12);--swc-button-background-color-down: rgba(0, 0, 0, .12);--swc-button-background-color-focus: rgba(0, 0, 0, .12);--swc-button-content-color-default: rgba(0, 0, 0, .84);--swc-button-content-color-hover: rgba(0, 0, 0, .93);--swc-button-content-color-down: rgba(0, 0, 0, .93);--swc-button-content-color-focus: rgba(0, 0, 0, .93)}:host([static-color=\"black\"][fill-style=\"outline\"]){--swc-button-background-color-default: rgba(0, 0, 0, 0);--swc-button-background-color-hover: rgba(0, 0, 0, .09);--swc-button-background-color-down: rgba(0, 0, 0, .09);--swc-button-background-color-focus: rgba(0, 0, 0, .09);--swc-button-border-color-default: rgba(0, 0, 0, .84);--swc-button-border-color-hover: rgba(0, 0, 0, .93);--swc-button-border-color-down: rgba(0, 0, 0, .93);--swc-button-border-color-focus: rgba(0, 0, 0, .93);--swc-button-content-color-default: rgba(0, 0, 0, .84);--swc-button-content-color-hover: rgba(0, 0, 0, .93);--swc-button-content-color-down: rgba(0, 0, 0, .93);--swc-button-content-color-focus: rgba(0, 0, 0, .93);--swc-button-background-color-disabled: rgba(0, 0, 0, 0);--swc-button-border-color-disabled: var(--swc-transparent-black-300);--swc-button-content-color-disabled: var(--swc-transparent-black-400)}:host([static-color=\"black\"][variant=\"secondary\"][fill-style=\"outline\"]){--swc-button-background-color-default: rgba(0, 0, 0, 0);--swc-button-background-color-hover: rgba(0, 0, 0, .09);--swc-button-background-color-down: rgba(0, 0, 0, .09);--swc-button-background-color-focus: rgba(0, 0, 0, .09);--swc-button-border-color-default: rgba(0, 0, 0, .15);--swc-button-border-color-hover: rgba(0, 0, 0, .22);--swc-button-border-color-down: rgba(0, 0, 0, .22);--swc-button-border-color-focus: rgba(0, 0, 0, .22)}.swc-Button--iconOnly{--swc-button-border-radius: 50%;--swc-button-gap: 0;inline-size:var(--_swc-button-min-block-size);padding-inline:calc(var(--swc-button-edge-to-visual-only, 5px) - var(--_swc-button-border-width))}.swc-Button--iconOnly slot[name=icon]::slotted(*){--swc-button-edge-to-visual: 0;align-self:center}:host([pending]) .swc-Button{cursor:default}.swc-Button--pendingActive{--swc-button-down-state-transform: none;justify-content:center;inline-size:var(--_swc-button-pending-inline-size);--swc-button-background-color-default: var(--swc-button-background-color-disabled, var(--swc-gray-100));--swc-button-background-color-hover: var(--swc-button-background-color-disabled, var(--swc-gray-100));--swc-button-background-color-down: var(--swc-button-background-color-disabled, var(--swc-gray-100));--swc-button-background-color-focus: var(--swc-button-background-color-disabled, var(--swc-gray-100));--swc-button-border-color-default: var(--swc-button-border-color-disabled, transparent);--swc-button-border-color-hover: var(--swc-button-border-color-disabled, transparent);--swc-button-border-color-down: var(--swc-button-border-color-disabled, transparent);--swc-button-border-color-focus: var(--swc-button-border-color-disabled, transparent);--swc-button-content-color-default: var(--swc-button-content-color-disabled, var(--swc-gray-400));--swc-button-content-color-hover: var(--swc-button-content-color-disabled, var(--swc-gray-400));--swc-button-content-color-down: var(--swc-button-content-color-disabled, var(--swc-gray-400));--swc-button-content-color-focus: var(--swc-button-content-color-disabled, var(--swc-gray-400))}.swc-Button--pendingActive .swc-Button-label,.swc-Button--pendingActive slot[name=icon]::slotted(*){display:none}:host([truncate]) .swc-Button-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}:host([justified]){flex-grow:1;justify-self:stretch;inline-size:100%}:host([justified]) .swc-Button{inline-size:100%}@media(prefers-reduced-motion:reduce){.swc-Button{transition-duration:0ms}}@media(forced-colors:active){.swc-Button--pendingActive{--swc-button-background-color-default: ButtonFace;--swc-button-background-color-hover: ButtonFace;--swc-button-background-color-down: ButtonFace;--swc-button-background-color-focus: ButtonFace;--swc-button-border-color-default: GrayText;--swc-button-border-color-hover: GrayText;--swc-button-border-color-down: GrayText;--swc-button-border-color-focus: GrayText;--swc-button-content-color-default: GrayText;--swc-button-content-color-hover: GrayText;--swc-button-content-color-down: GrayText;--swc-button-content-color-focus: GrayText}}`;

// deps/swc/swc-dist/components/button/button-base.js
var t6 = i`:host{display:inline-block;inline-size:-moz-fit-content;inline-size:fit-content;vertical-align:top}*{box-sizing:border-box}.swc-Button{-webkit-tap-highlight-color:transparent;display:inline-flex;position:relative;align-items:center;justify-content:center;margin:0;text-transform:none;-webkit-text-decoration:none;text-decoration:none;border-style:solid;overflow:visible;-webkit-user-select:none;-moz-user-select:none;user-select:none}.swc-Button:focus-visible{outline:2px solid var(--swc-button-focus-indicator-color, var(--swc-blue-800));outline-offset:2px}.swc-Button:disabled:is(*,:hover){color:var(--swc-button-content-color-disabled, var(--swc-gray-400));background-color:var(--swc-button-background-color-disabled, var(--swc-gray-100));border-color:var(--swc-button-border-color-disabled, transparent);transform:none}:host([disabled]) slot[name=icon]::slotted(*){pointer-events:none}`;

// node_modules/lit-html/directives/if-defined.js
var o6 = (o11) => o11 ?? A;

// node_modules/@lit/reactive-element/decorators/property.js
var o7 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r5 = (t10 = o7, e14, r9) => {
  const { kind: n10, metadata: i10 } = r9;
  let s5 = globalThis.litPropertyMetadata.get(i10);
  if (void 0 === s5 && globalThis.litPropertyMetadata.set(i10, s5 = /* @__PURE__ */ new Map()), "setter" === n10 && ((t10 = Object.create(t10)).wrapped = true), s5.set(r9.name, t10), "accessor" === n10) {
    const { name: o11 } = r9;
    return { set(r10) {
      const n11 = e14.get.call(this);
      e14.set.call(this, r10), this.requestUpdate(o11, n11, t10, true, r10);
    }, init(e15) {
      return void 0 !== e15 && this.C(o11, void 0, t10, e15), e15;
    } };
  }
  if ("setter" === n10) {
    const { name: o11 } = r9;
    return function(r10) {
      const n11 = this[o11];
      e14.call(this, r10), this.requestUpdate(o11, n11, t10, true, r10);
    };
  }
  throw Error("Unsupported decorator location: " + n10);
};
function n4(t10) {
  return (e14, o11) => "object" == typeof o11 ? r5(t10, e14, o11) : ((t11, e15, o12) => {
    const r9 = e15.hasOwnProperty(o12);
    return e15.constructor.createProperty(o12, t11), r9 ? Object.getOwnPropertyDescriptor(e15, o12) : void 0;
  })(t10, e14, o11);
}

// node_modules/@lit/reactive-element/decorators/state.js
function r6(r9) {
  return n4({ ...r9, state: true, attribute: false });
}

// node_modules/@lit/reactive-element/decorators/base.js
var e7 = (e14, t10, c5) => (c5.configurable = true, c5.enumerable = true, Reflect.decorate && "object" != typeof t10 && Object.defineProperty(e14, t10, c5), c5);

// node_modules/@lit/reactive-element/decorators/query-assigned-nodes.js
function n5(n10) {
  return (o11, r9) => {
    const { slot: e14 } = n10 ?? {}, s5 = "slot" + (e14 ? `[name=${e14}]` : ":not([name])");
    return e7(o11, r9, { get() {
      const t10 = this.renderRoot?.querySelector(s5);
      return t10?.assignedNodes(n10) ?? [];
    } });
  };
}

// deps/swc/swc-dist/core/components/button/Button.types.js
var e8 = [
  "s",
  "m",
  "l",
  "xl"
];
var t7 = [
  "primary",
  "secondary",
  "accent",
  "negative"
];
var n6 = ["fill", "outline"];

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e9(e14, t10, n10, r9) {
  var i10 = arguments.length, a6 = i10 < 3 ? t10 : r9 === null ? r9 = Object.getOwnPropertyDescriptor(t10, n10) : r9, o11;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a6 = Reflect.decorate(e14, t10, n10, r9);
  else for (var s5 = e14.length - 1; s5 >= 0; s5--) (o11 = e14[s5]) && (a6 = (i10 < 3 ? o11(a6) : i10 > 3 ? o11(t10, n10, a6) : o11(t10, n10)) || a6);
  return i10 > 3 && a6 && Object.defineProperty(t10, n10, a6), a6;
}

// deps/swc/swc-dist/core/element/define-element.js
function e10(e14, t10) {
  window.__swc && window.__swc.DEBUG && customElements.get(e14) && window.__swc.warn(void 0, `Attempted to redefine <${e14}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e14, t10);
}

// deps/swc/swc-dist/core/element/version.js
var e11 = "0.1.0";
var t8 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e12(e14 = document) {
  var t10;
  let n10 = e14.activeElement;
  for (; !(n10 == null || (t10 = n10.shadowRoot) == null) && t10.activeElement; ) n10 = n10.shadowRoot.activeElement;
  return n10;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i6;
function a3(t10) {
  class n10 extends t10 {
    hasVisibleFocusInTree() {
      var t11;
      let n11 = e12(this.getRootNode());
      return (t11 = n11 == null ? void 0 : n11.matches(":focus-visible")) == null ? false : t11;
    }
  }
  return n10;
}
var o8 = class extends a3(i4) {
  get dir() {
    var e14;
    return (e14 = getComputedStyle(this).direction) == null ? "ltr" : e14;
  }
};
if (i6 = o8, i6.VERSION = e11, i6.CORE_VERSION = t8, true) {
  let e14 = {
    default: false,
    accessibility: false,
    api: false
  }, t10 = {
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
      ...((c5 = window.__swc) == null ? void 0 : c5.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t10,
      ...((l4 = window.__swc) == null ? void 0 : l4.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e15, t11, n10, { type: r9 = "api", level: i10 = "default", issues: a6 } = {}) => {
      let { localName: o11 = "base" } = e15 || {}, s6 = `${o11}:${r9}:${i10}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s6) || window.__swc.ignoreWarningLocalNames[o11] || window.__swc.ignoreWarningTypes[r9] || window.__swc.ignoreWarningLevels[i10]) return;
      window.__swc.issuedWarnings.add(s6);
      let c6 = "";
      a6 && a6.length && (a6.unshift(""), c6 = a6.join("\n    - ") + "\n");
      let l5 = i10 === "deprecation" ? "DEPRECATION NOTICE: " : "", u3 = e15 ? "\nInspect this issue in the follow element:" : "", d4 = (e15 ? "\n\n" : "\n") + n10 + "\n", f4 = [];
      f4.push(l5 + t11 + "\n" + c6 + u3), e15 && f4.push(e15), f4.push(d4, { data: {
        localName: o11,
        type: r9,
        level: i10
      } }), console.warn(...f4);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s5;
var c5;
var l4;

// node_modules/@lit-labs/observers/mutation-controller.js
var s4 = class {
  constructor(s5, { target: i10, config: h3, callback: o11, skipInitial: e14 }) {
    this.t = /* @__PURE__ */ new Set(), this.o = false, this.i = false, this.h = s5, null !== i10 && this.t.add(i10 ?? s5), this.l = h3, this.o = e14 ?? this.o, this.callback = o11, o5 || (window.MutationObserver ? (this.u = new MutationObserver((t10) => {
      this.handleChanges(t10), this.h.requestUpdate();
    }), s5.addController(this)) : console.warn("MutationController error: browser does not support MutationObserver."));
  }
  handleChanges(t10) {
    this.value = this.callback?.(t10, this.u);
  }
  hostConnected() {
    for (const t10 of this.t) this.observe(t10);
  }
  hostDisconnected() {
    this.disconnect();
  }
  async hostUpdated() {
    const t10 = this.u.takeRecords();
    (t10.length || !this.o && this.i) && this.handleChanges(t10), this.i = false;
  }
  observe(t10) {
    this.t.add(t10), this.u.observe(t10, this.l), this.i = true, this.h.requestUpdate();
  }
  disconnect() {
    this.u.disconnect();
  }
};

// deps/swc/swc-dist/core/mixins/observe-slot-presence.js
var t9 = /* @__PURE__ */ Symbol("slotContentIsPresent");
function n7(n10, r9) {
  let i10 = Array.isArray(r9) ? r9 : [r9];
  class a6 extends n10 {
    constructor(...n11) {
      super(...n11), this[t9] = /* @__PURE__ */ new Map(), this.managePresenceObservedSlot = () => {
        let e14 = false;
        i10.forEach((n12) => {
          let r10 = !!this.querySelector(`:scope > ${n12}`), i11 = this[t9].get(n12) || false;
          e14 = e14 || i11 !== r10, this[t9].set(n12, !!this.querySelector(`:scope > ${n12}`));
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
      if (i10.length === 1) return this[t9].get(i10[0]) || false;
      throw Error("Multiple selectors provided to `ObserveSlotPresence` use `getSlotContentPresence(selector: string)` instead.");
    }
    getSlotContentPresence(e14) {
      if (this[t9].has(e14)) return this[t9].get(e14) || false;
      throw Error(`The provided selector \`${e14}\` is not being observed.`);
    }
  }
  return a6;
}

// deps/swc/swc-dist/core/_virtual/_@oxc-project_runtime@0.124.0/helpers/defineProperty.js
function e13(e14, t10, n10) {
  return t10 in e14 ? Object.defineProperty(e14, t10, { value: n10, enumerable: true, configurable: true, writable: true }) : e14[t10] = n10, e14;
}

// deps/swc/swc-dist/core/mixins/observe-slot-text.js
var a4 = /* @__PURE__ */ Symbol("assignedNodes");
function o9(o11, s5, c5 = []) {
  let l4;
  var u3;
  let d4 = (e14) => (t10) => e14.matches(t10);
  l4 = u3 = a4;
  class f4 extends o11 {
    constructor(...e14) {
      super(...e14), e13(this, l4, void 0), this.slotHasContent = false, new s4(this, {
        config: {
          characterData: true,
          subtree: true
        },
        callback: (e15) => {
          for (let t10 of e15) if (t10.type === "characterData") {
            this.manageTextObservedSlot();
            return;
          }
        }
      });
    }
    manageTextObservedSlot() {
      this[a4] && (this.slotHasContent = [...this[a4]].filter((e14) => {
        let t10 = e14;
        return t10.tagName ? !c5.some(d4(t10)) : t10.textContent ? t10.textContent.trim() : false;
      }).length > 0);
    }
    update(e14) {
      if (!this.hasUpdated) {
        let { childNodes: e15 } = this;
        this.slotHasContent = [...e15].filter((e16) => {
          let t10 = e16;
          return t10.tagName ? c5.some(d4(t10)) ? false : s5 ? t10.getAttribute("slot") === s5 : !t10.hasAttribute("slot") : t10.textContent ? t10.textContent.trim() : false;
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
  })], f4.prototype, "slotHasContent", void 0), e9([n5({
    slot: s5,
    flatten: true
  })], f4.prototype, u3, void 0), f4;
}

// deps/swc/swc-dist/core/mixins/sized-mixin.js
var r7 = [
  "s",
  "m",
  "l",
  "xl"
];
function i8(n10, { validSizes: i10 = [...r7], noDefaultSize: a6, defaultSize: o11 = "m" } = {}) {
  var s5;
  class c5 extends n10 {
    constructor(...e14) {
      super(...e14), this._size = o11;
    }
    get size() {
      return this._size || o11;
    }
    set size(e14) {
      let t10 = a6 ? null : o11, n11 = e14 && e14.toLocaleLowerCase(), r9 = this.constructor.VALID_SIZES.includes(n11) ? n11 : t10;
      if (r9 && this.setAttribute("size", r9), this._size === r9) return;
      let i11 = this._size;
      this._size = r9, this.requestUpdate("size", i11);
    }
    update(e14) {
      !this.hasAttribute("size") && !a6 && this.setAttribute("size", this.size), super.update(e14);
    }
  }
  return s5 = c5, s5.VALID_SIZES = i10, e9([n4({ type: String })], c5.prototype, "size", null), c5;
}

// deps/swc/swc-dist/core/components/button/Button.base.js
var c4;
var l3 = class extends i8(o9(n7(o8, '[slot="icon"]'), ""), { validSizes: e8 }) {
  constructor(...e14) {
    super(...e14), this.disabled = false, this.pending = false, this.pendingActive = false, this._pendingTimer = null, this.handleClick = (e15) => {
      (this.disabled || this.pending) && (e15.preventDefault(), e15.stopImmediatePropagation());
    };
  }
  get hasIcon() {
    return this.slotContentIsPresent;
  }
  get hasLabel() {
    return this.slotHasContent;
  }
  getResolvedAccessibleName() {
    var e14, t10;
    return (e14 = this.accessibleLabel) == null ? ((t10 = this.textContent) == null ? void 0 : t10.trim()) || null : e14;
  }
  getPendingAccessibleName() {
    if (this.pendingLabel) return this.pendingLabel;
    let e14 = this.getResolvedAccessibleName();
    return e14 ? `${e14}, busy` : "Busy";
  }
  getForwardedButtonAttributes() {
    return {
      disabled: this.disabled,
      "aria-disabled": this.pending && !this.disabled ? "true" : void 0
    };
  }
  connectedCallback() {
    super.connectedCallback(), this.addEventListener("click", this.handleClick, true);
  }
  disconnectedCallback() {
    this.removeEventListener("click", this.handleClick, true), this._pendingTimer !== null && (clearTimeout(this._pendingTimer), this._pendingTimer = null), this.pendingActive = false, super.disconnectedCallback();
  }
  update(e14) {
    var t10;
    if (e14.has("pending")) if (this.pending) this._pendingTimer = setTimeout(() => {
      if (this.pending) {
        let e15 = this.renderRoot.querySelector("button");
        e15 && e15.style.setProperty("--_swc-button-pending-inline-size", `${e15.offsetWidth}px`), this.pendingActive = true;
      }
      this._pendingTimer = null;
    }, 1e3);
    else {
      var n10;
      this._pendingTimer !== null && (clearTimeout(this._pendingTimer), this._pendingTimer = null), (n10 = this.renderRoot.querySelector("button")) == null || n10.style.removeProperty("--_swc-button-pending-inline-size"), this.pendingActive = false;
    }
    super.update(e14), (t10 = window.__swc) != null && t10.DEBUG && (this.pending && this.disabled && window.__swc.warn(this, `<${this.localName}> should not set both "pending" and "disabled" simultaneously. Use "pending" to keep the button focusable while unavailable, or "disabled" to fully remove it from the tab order.`, "https://opensource.adobe.com/spectrum-web-components/components/button/#pending", { issues: ["pending + disabled"] }), this.hasIcon && !this.hasLabel && !this.accessibleLabel && window.__swc.warn(this, `<${this.localName}> with an icon and no label must have an "accessible-label" attribute to be accessible.`, "https://opensource.adobe.com/spectrum-web-components/components/button/#icon-only", { issues: ["accessible-label"] }));
  }
};
c4 = l3, c4.shadowRootOptions = {
  ...o8.shadowRootOptions,
  delegatesFocus: true
}, e9([n4({
  type: Boolean,
  reflect: true
})], l3.prototype, "disabled", void 0), e9([n4({
  type: Boolean,
  reflect: true
})], l3.prototype, "pending", void 0), e9([n4({
  type: String,
  attribute: "accessible-label"
})], l3.prototype, "accessibleLabel", void 0), e9([n4({
  type: String,
  attribute: "pending-label"
})], l3.prototype, "pendingLabel", void 0), e9([r6()], l3.prototype, "pendingActive", void 0);

// deps/swc/swc-dist/components/button/Button2.js
var f3 = class extends l3 {
  constructor(...e14) {
    super(...e14), this.variant = "primary", this.fillStyle = "fill", this.truncate = false, this.justified = false;
  }
  static get styles() {
    return [
      t6,
      t4,
      t5
    ];
  }
  render() {
    return b2`
      <button
        class=${e6({
      "swc-Button": true,
      "swc-Button--hasIcon": this.hasIcon,
      "swc-Button--iconOnly": this.hasIcon && !this.hasLabel,
      "swc-Button--pendingActive": this.pendingActive
    })}
        type="button"
        @click=${this.handleClick}
        ?disabled=${this.disabled}
        aria-disabled=${o6(this.pending && !this.disabled ? "true" : void 0)}
        aria-label=${o6(this.pending ? this.getPendingAccessibleName() : this.accessibleLabel)}
      >
        <slot name="icon"></slot>
        <span class="swc-Button-label">
          <slot></slot>
        </span>
        ${r4(this.pending, this.pendingActive)}
      </button>
    `;
  }
  update(e14) {
    var t10;
    super.update(e14), (t10 = window.__swc) != null && t10.DEBUG && (t7.includes(this.variant) || window.__swc.warn(this, `<${this.localName}> element expects the "variant" attribute to be one of the following:`, "https://opensource.adobe.com/spectrum-web-components/components/button/#variants", { issues: [...t7] }), n6.includes(this.fillStyle) || window.__swc.warn(this, `<${this.localName}> element expects the "fill-style" attribute to be one of the following:`, "https://opensource.adobe.com/spectrum-web-components/components/button/#fill-style", { issues: [...n6] }), this.fillStyle === "outline" && (this.variant === "accent" || this.variant === "negative") && window.__swc.warn(this, `<${this.localName}> element only supports "fill-style=outline" with the "primary" and "secondary" variants.`, "https://opensource.adobe.com/spectrum-web-components/components/button/#fill-style", { issues: ["primary", "secondary"] }), this.staticColor && (this.variant === "accent" || this.variant === "negative") && window.__swc.warn(this, `<${this.localName}> element only supports "static-color" with the "primary" and "secondary" variants.`, "https://opensource.adobe.com/spectrum-web-components/components/button/#static-color", { issues: ["primary", "secondary"] }));
  }
};
e([n4({
  type: String,
  reflect: true
})], f3.prototype, "variant", void 0), e([n4({
  type: String,
  reflect: true,
  attribute: "fill-style"
})], f3.prototype, "fillStyle", void 0), e([n4({
  type: String,
  reflect: true,
  attribute: "static-color"
})], f3.prototype, "staticColor", void 0), e([n4({
  type: Boolean,
  reflect: true
})], f3.prototype, "truncate", void 0), e([n4({
  type: Boolean,
  reflect: true
})], f3.prototype, "justified", void 0);

// deps/swc/swc-dist/components/button/swc-button.js
e10("swc-button", f3);
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
lit-html/directive.js:
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

lit-html/directives/class-map.js:
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
