// deps/swc/swc-dist/_virtual/_@oxc-project_runtime@0.124.0/helpers/decorate.js
function e(e9, t5, n5, r5) {
  var i6 = arguments.length, a5 = i6 < 3 ? t5 : r5 === null ? r5 = Object.getOwnPropertyDescriptor(t5, n5) : r5, o7;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a5 = Reflect.decorate(e9, t5, n5, r5);
  else for (var s4 = e9.length - 1; s4 >= 0; s4--) (o7 = e9[s4]) && (a5 = (i6 < 3 ? o7(a5) : i6 > 3 ? o7(t5, n5, a5) : o7(t5, n5)) || a5);
  return i6 > 3 && a5 && Object.defineProperty(t5, n5, a5), a5;
}

// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e2 = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t5, e9, o7) {
    if (this._$cssResult$ = true, o7 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t5, this.t = e9;
  }
  get styleSheet() {
    let t5 = this.o;
    const s4 = this.t;
    if (e2 && void 0 === t5) {
      const e9 = void 0 !== s4 && 1 === s4.length;
      e9 && (t5 = o.get(s4)), void 0 === t5 && ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText), e9 && o.set(s4, t5));
    }
    return t5;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
var i = (t5, ...e9) => {
  const o7 = 1 === t5.length ? t5[0] : e9.reduce((e10, s4, o8) => e10 + ((t6) => {
    if (true === t6._$cssResult$) return t6.cssText;
    if ("number" == typeof t6) return t6;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t6 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s4) + t5[o8 + 1], t5[0]);
  return new n(o7, t5, s);
};
var S = (s4, o7) => {
  if (e2) s4.adoptedStyleSheets = o7.map((t5) => t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet);
  else for (const e9 of o7) {
    const o8 = document.createElement("style"), n5 = t.litNonce;
    void 0 !== n5 && o8.setAttribute("nonce", n5), o8.textContent = e9.cssText, s4.appendChild(o8);
  }
};
var c = e2 ? (t5) => t5 : (t5) => t5 instanceof CSSStyleSheet ? ((t6) => {
  let e9 = "";
  for (const s4 of t6.cssRules) e9 += s4.cssText;
  return r(e9);
})(t5) : t5;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e3, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t5, s4) => t5;
var u = { toAttribute(t5, s4) {
  switch (s4) {
    case Boolean:
      t5 = t5 ? l : null;
      break;
    case Object:
    case Array:
      t5 = null == t5 ? t5 : JSON.stringify(t5);
  }
  return t5;
}, fromAttribute(t5, s4) {
  let i6 = t5;
  switch (s4) {
    case Boolean:
      i6 = null !== t5;
      break;
    case Number:
      i6 = null === t5 ? null : Number(t5);
      break;
    case Object:
    case Array:
      try {
        i6 = JSON.parse(t5);
      } catch (t6) {
        i6 = null;
      }
  }
  return i6;
} };
var f = (t5, s4) => !i2(t5, s4);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t5) {
    this._$Ei(), (this.l ??= []).push(t5);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t5, s4 = b) {
    if (s4.state && (s4.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t5) && ((s4 = Object.create(s4)).wrapped = true), this.elementProperties.set(t5, s4), !s4.noAccessor) {
      const i6 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t5, i6, s4);
      void 0 !== h3 && e3(this.prototype, t5, h3);
    }
  }
  static getPropertyDescriptor(t5, s4, i6) {
    const { get: e9, set: r5 } = h(this.prototype, t5) ?? { get() {
      return this[s4];
    }, set(t6) {
      this[s4] = t6;
    } };
    return { get: e9, set(s5) {
      const h3 = e9?.call(this);
      r5?.call(this, s5), this.requestUpdate(t5, h3, i6);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t5) {
    return this.elementProperties.get(t5) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t5 = n2(this);
    t5.finalize(), void 0 !== t5.l && (this.l = [...t5.l]), this.elementProperties = new Map(t5.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t6 = this.properties, s4 = [...r2(t6), ...o2(t6)];
      for (const i6 of s4) this.createProperty(i6, t6[i6]);
    }
    const t5 = this[Symbol.metadata];
    if (null !== t5) {
      const s4 = litPropertyMetadata.get(t5);
      if (void 0 !== s4) for (const [t6, i6] of s4) this.elementProperties.set(t6, i6);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t6, s4] of this.elementProperties) {
      const i6 = this._$Eu(t6, s4);
      void 0 !== i6 && this._$Eh.set(i6, t6);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s4) {
    const i6 = [];
    if (Array.isArray(s4)) {
      const e9 = new Set(s4.flat(1 / 0).reverse());
      for (const s5 of e9) i6.unshift(c(s5));
    } else void 0 !== s4 && i6.push(c(s4));
    return i6;
  }
  static _$Eu(t5, s4) {
    const i6 = s4.attribute;
    return false === i6 ? void 0 : "string" == typeof i6 ? i6 : "string" == typeof t5 ? t5.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t5) => this.enableUpdating = t5), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t5) => t5(this));
  }
  addController(t5) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t5), void 0 !== this.renderRoot && this.isConnected && t5.hostConnected?.();
  }
  removeController(t5) {
    this._$EO?.delete(t5);
  }
  _$E_() {
    const t5 = /* @__PURE__ */ new Map(), s4 = this.constructor.elementProperties;
    for (const i6 of s4.keys()) this.hasOwnProperty(i6) && (t5.set(i6, this[i6]), delete this[i6]);
    t5.size > 0 && (this._$Ep = t5);
  }
  createRenderRoot() {
    const t5 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t5, this.constructor.elementStyles), t5;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t5) => t5.hostConnected?.());
  }
  enableUpdating(t5) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t5) => t5.hostDisconnected?.());
  }
  attributeChangedCallback(t5, s4, i6) {
    this._$AK(t5, i6);
  }
  _$ET(t5, s4) {
    const i6 = this.constructor.elementProperties.get(t5), e9 = this.constructor._$Eu(t5, i6);
    if (void 0 !== e9 && true === i6.reflect) {
      const h3 = (void 0 !== i6.converter?.toAttribute ? i6.converter : u).toAttribute(s4, i6.type);
      this._$Em = t5, null == h3 ? this.removeAttribute(e9) : this.setAttribute(e9, h3), this._$Em = null;
    }
  }
  _$AK(t5, s4) {
    const i6 = this.constructor, e9 = i6._$Eh.get(t5);
    if (void 0 !== e9 && this._$Em !== e9) {
      const t6 = i6.getPropertyOptions(e9), h3 = "function" == typeof t6.converter ? { fromAttribute: t6.converter } : void 0 !== t6.converter?.fromAttribute ? t6.converter : u;
      this._$Em = e9;
      const r5 = h3.fromAttribute(s4, t6.type);
      this[e9] = r5 ?? this._$Ej?.get(e9) ?? r5, this._$Em = null;
    }
  }
  requestUpdate(t5, s4, i6, e9 = false, h3) {
    if (void 0 !== t5) {
      const r5 = this.constructor;
      if (false === e9 && (h3 = this[t5]), i6 ??= r5.getPropertyOptions(t5), !((i6.hasChanged ?? f)(h3, s4) || i6.useDefault && i6.reflect && h3 === this._$Ej?.get(t5) && !this.hasAttribute(r5._$Eu(t5, i6)))) return;
      this.C(t5, s4, i6);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t5, s4, { useDefault: i6, reflect: e9, wrapped: h3 }, r5) {
    i6 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) && (this._$Ej.set(t5, r5 ?? s4 ?? this[t5]), true !== h3 || void 0 !== r5) || (this._$AL.has(t5) || (this.hasUpdated || i6 || (s4 = void 0), this._$AL.set(t5, s4)), true === e9 && this._$Em !== t5 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t5));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t6) {
      Promise.reject(t6);
    }
    const t5 = this.scheduleUpdate();
    return null != t5 && await t5, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t7, s5] of this._$Ep) this[t7] = s5;
        this._$Ep = void 0;
      }
      const t6 = this.constructor.elementProperties;
      if (t6.size > 0) for (const [s5, i6] of t6) {
        const { wrapped: t7 } = i6, e9 = this[s5];
        true !== t7 || this._$AL.has(s5) || void 0 === e9 || this.C(s5, void 0, i6, e9);
      }
    }
    let t5 = false;
    const s4 = this._$AL;
    try {
      t5 = this.shouldUpdate(s4), t5 ? (this.willUpdate(s4), this._$EO?.forEach((t6) => t6.hostUpdate?.()), this.update(s4)) : this._$EM();
    } catch (s5) {
      throw t5 = false, this._$EM(), s5;
    }
    t5 && this._$AE(s4);
  }
  willUpdate(t5) {
  }
  _$AE(t5) {
    this._$EO?.forEach((t6) => t6.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t5)), this.updated(t5);
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
  shouldUpdate(t5) {
    return true;
  }
  update(t5) {
    this._$Eq &&= this._$Eq.forEach((t6) => this._$ET(t6, this[t6])), this._$EM();
  }
  updated(t5) {
  }
  firstUpdated(t5) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t5) => t5;
var s2 = t2.trustedTypes;
var e4 = s2 ? s2.createPolicy("lit-html", { createHTML: (t5) => t5 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t5) => null === t5 || "object" != typeof t5 && "function" != typeof t5;
var u2 = Array.isArray;
var d2 = (t5) => u2(t5) || "function" == typeof t5?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t5) => (i6, ...s4) => ({ _$litType$: t5, strings: i6, values: s4 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t5, i6) {
  if (!u2(t5) || !t5.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e4 ? e4.createHTML(i6) : i6;
}
var N = (t5, i6) => {
  const s4 = t5.length - 1, e9 = [];
  let n5, l3 = 2 === i6 ? "<svg>" : 3 === i6 ? "<math>" : "", c4 = v;
  for (let i7 = 0; i7 < s4; i7++) {
    const s5 = t5[i7];
    let a5, u3, d3 = -1, f3 = 0;
    for (; f3 < s5.length && (c4.lastIndex = f3, u3 = c4.exec(s5), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n5 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n5 ?? v, d3 = -1) : void 0 === u3[1] ? d3 = -2 : (d3 = c4.lastIndex - u3[2].length, a5 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n5 = void 0);
    const x2 = c4 === p2 && t5[i7 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s5 + r3 : d3 >= 0 ? (e9.push(a5), s5.slice(0, d3) + h2 + s5.slice(d3) + o3 + x2) : s5 + o3 + (-2 === d3 ? i7 : x2);
  }
  return [V(t5, l3 + (t5[s4] || "<?>") + (2 === i6 ? "</svg>" : 3 === i6 ? "</math>" : "")), e9];
};
var S2 = class _S {
  constructor({ strings: t5, _$litType$: i6 }, e9) {
    let r5;
    this.parts = [];
    let l3 = 0, a5 = 0;
    const u3 = t5.length - 1, d3 = this.parts, [f3, v2] = N(t5, i6);
    if (this.el = _S.createElement(f3, e9), P.currentNode = this.el.content, 2 === i6 || 3 === i6) {
      const t6 = this.el.content.firstChild;
      t6.replaceWith(...t6.childNodes);
    }
    for (; null !== (r5 = P.nextNode()) && d3.length < u3; ) {
      if (1 === r5.nodeType) {
        if (r5.hasAttributes()) for (const t6 of r5.getAttributeNames()) if (t6.endsWith(h2)) {
          const i7 = v2[a5++], s4 = r5.getAttribute(t6).split(o3), e10 = /([.?@])?(.*)/.exec(i7);
          d3.push({ type: 1, index: l3, name: e10[2], strings: s4, ctor: "." === e10[1] ? I : "?" === e10[1] ? L : "@" === e10[1] ? z : H }), r5.removeAttribute(t6);
        } else t6.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r5.removeAttribute(t6));
        if (y2.test(r5.tagName)) {
          const t6 = r5.textContent.split(o3), i7 = t6.length - 1;
          if (i7 > 0) {
            r5.textContent = s2 ? s2.emptyScript : "";
            for (let s4 = 0; s4 < i7; s4++) r5.append(t6[s4], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r5.append(t6[i7], c3());
          }
        }
      } else if (8 === r5.nodeType) if (r5.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t6 = -1;
        for (; -1 !== (t6 = r5.data.indexOf(o3, t6 + 1)); ) d3.push({ type: 7, index: l3 }), t6 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t5, i6) {
    const s4 = l2.createElement("template");
    return s4.innerHTML = t5, s4;
  }
};
function M(t5, i6, s4 = t5, e9) {
  if (i6 === E) return i6;
  let h3 = void 0 !== e9 ? s4._$Co?.[e9] : s4._$Cl;
  const o7 = a2(i6) ? void 0 : i6._$litDirective$;
  return h3?.constructor !== o7 && (h3?._$AO?.(false), void 0 === o7 ? h3 = void 0 : (h3 = new o7(t5), h3._$AT(t5, s4, e9)), void 0 !== e9 ? (s4._$Co ??= [])[e9] = h3 : s4._$Cl = h3), void 0 !== h3 && (i6 = M(t5, h3._$AS(t5, i6.values), h3, e9)), i6;
}
var R = class {
  constructor(t5, i6) {
    this._$AV = [], this._$AN = void 0, this._$AD = t5, this._$AM = i6;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t5) {
    const { el: { content: i6 }, parts: s4 } = this._$AD, e9 = (t5?.creationScope ?? l2).importNode(i6, true);
    P.currentNode = e9;
    let h3 = P.nextNode(), o7 = 0, n5 = 0, r5 = s4[0];
    for (; void 0 !== r5; ) {
      if (o7 === r5.index) {
        let i7;
        2 === r5.type ? i7 = new k(h3, h3.nextSibling, this, t5) : 1 === r5.type ? i7 = new r5.ctor(h3, r5.name, r5.strings, this, t5) : 6 === r5.type && (i7 = new Z(h3, this, t5)), this._$AV.push(i7), r5 = s4[++n5];
      }
      o7 !== r5?.index && (h3 = P.nextNode(), o7++);
    }
    return P.currentNode = l2, e9;
  }
  p(t5) {
    let i6 = 0;
    for (const s4 of this._$AV) void 0 !== s4 && (void 0 !== s4.strings ? (s4._$AI(t5, s4, i6), i6 += s4.strings.length - 2) : s4._$AI(t5[i6])), i6++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t5, i6, s4, e9) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t5, this._$AB = i6, this._$AM = s4, this.options = e9, this._$Cv = e9?.isConnected ?? true;
  }
  get parentNode() {
    let t5 = this._$AA.parentNode;
    const i6 = this._$AM;
    return void 0 !== i6 && 11 === t5?.nodeType && (t5 = i6.parentNode), t5;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t5, i6 = this) {
    t5 = M(this, t5, i6), a2(t5) ? t5 === A || null == t5 || "" === t5 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t5 !== this._$AH && t5 !== E && this._(t5) : void 0 !== t5._$litType$ ? this.$(t5) : void 0 !== t5.nodeType ? this.T(t5) : d2(t5) ? this.k(t5) : this._(t5);
  }
  O(t5) {
    return this._$AA.parentNode.insertBefore(t5, this._$AB);
  }
  T(t5) {
    this._$AH !== t5 && (this._$AR(), this._$AH = this.O(t5));
  }
  _(t5) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t5 : this.T(l2.createTextNode(t5)), this._$AH = t5;
  }
  $(t5) {
    const { values: i6, _$litType$: s4 } = t5, e9 = "number" == typeof s4 ? this._$AC(t5) : (void 0 === s4.el && (s4.el = S2.createElement(V(s4.h, s4.h[0]), this.options)), s4);
    if (this._$AH?._$AD === e9) this._$AH.p(i6);
    else {
      const t6 = new R(e9, this), s5 = t6.u(this.options);
      t6.p(i6), this.T(s5), this._$AH = t6;
    }
  }
  _$AC(t5) {
    let i6 = C.get(t5.strings);
    return void 0 === i6 && C.set(t5.strings, i6 = new S2(t5)), i6;
  }
  k(t5) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i6 = this._$AH;
    let s4, e9 = 0;
    for (const h3 of t5) e9 === i6.length ? i6.push(s4 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s4 = i6[e9], s4._$AI(h3), e9++;
    e9 < i6.length && (this._$AR(s4 && s4._$AB.nextSibling, e9), i6.length = e9);
  }
  _$AR(t5 = this._$AA.nextSibling, s4) {
    for (this._$AP?.(false, true, s4); t5 !== this._$AB; ) {
      const s5 = i3(t5).nextSibling;
      i3(t5).remove(), t5 = s5;
    }
  }
  setConnected(t5) {
    void 0 === this._$AM && (this._$Cv = t5, this._$AP?.(t5));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t5, i6, s4, e9, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t5, this.name = i6, this._$AM = e9, this.options = h3, s4.length > 2 || "" !== s4[0] || "" !== s4[1] ? (this._$AH = Array(s4.length - 1).fill(new String()), this.strings = s4) : this._$AH = A;
  }
  _$AI(t5, i6 = this, s4, e9) {
    const h3 = this.strings;
    let o7 = false;
    if (void 0 === h3) t5 = M(this, t5, i6, 0), o7 = !a2(t5) || t5 !== this._$AH && t5 !== E, o7 && (this._$AH = t5);
    else {
      const e10 = t5;
      let n5, r5;
      for (t5 = h3[0], n5 = 0; n5 < h3.length - 1; n5++) r5 = M(this, e10[s4 + n5], i6, n5), r5 === E && (r5 = this._$AH[n5]), o7 ||= !a2(r5) || r5 !== this._$AH[n5], r5 === A ? t5 = A : t5 !== A && (t5 += (r5 ?? "") + h3[n5 + 1]), this._$AH[n5] = r5;
    }
    o7 && !e9 && this.j(t5);
  }
  j(t5) {
    t5 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t5 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t5) {
    this.element[this.name] = t5 === A ? void 0 : t5;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t5) {
    this.element.toggleAttribute(this.name, !!t5 && t5 !== A);
  }
};
var z = class extends H {
  constructor(t5, i6, s4, e9, h3) {
    super(t5, i6, s4, e9, h3), this.type = 5;
  }
  _$AI(t5, i6 = this) {
    if ((t5 = M(this, t5, i6, 0) ?? A) === E) return;
    const s4 = this._$AH, e9 = t5 === A && s4 !== A || t5.capture !== s4.capture || t5.once !== s4.once || t5.passive !== s4.passive, h3 = t5 !== A && (s4 === A || e9);
    e9 && this.element.removeEventListener(this.name, this, s4), h3 && this.element.addEventListener(this.name, this, t5), this._$AH = t5;
  }
  handleEvent(t5) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t5) : this._$AH.handleEvent(t5);
  }
};
var Z = class {
  constructor(t5, i6, s4) {
    this.element = t5, this.type = 6, this._$AN = void 0, this._$AM = i6, this.options = s4;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t5) {
    M(this, t5);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.2");
var D = (t5, i6, s4) => {
  const e9 = s4?.renderBefore ?? i6;
  let h3 = e9._$litPart$;
  if (void 0 === h3) {
    const t6 = s4?.renderBefore ?? null;
    e9._$litPart$ = h3 = new k(i6.insertBefore(c3(), t6), t6, void 0, s4 ?? {});
  }
  return h3._$AI(t5), h3;
};

// node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t5 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t5.firstChild, t5;
  }
  update(t5) {
    const r5 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t5), this._$Do = D(r5, this.renderRoot, this.renderOptions);
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

// deps/swc/swc-dist/patterns/conversational-ai/user-message/user-message.js
var t3 = i`:host{display:block;inline-size:-moz-fit-content;inline-size:fit-content;max-inline-size:536px;padding-block:var(--swc-user-message-padding-block, 8px);padding-inline:var(--swc-user-message-padding-inline, 16px);font-family:var(--swc-sans-font-family-stack);font-size:var(--swc-font-size-200);font-weight:400;line-height:1.5;color:var(--swc-gray-800);background:var(--swc-gray-50);border:1px solid transparent;border-radius:10px}*,*:before,*:after{box-sizing:border-box}:host([type=\"card\"]){inline-size:324px;min-inline-size:212px;max-inline-size:440px;padding:var(--swc-user-message-card-padding, 16px)}:host([type=\"media\"]){inline-size:-moz-fit-content;inline-size:fit-content;padding:var(--swc-user-message-media-padding, 8px)}.swc-UserMessage-attachment{display:flex;min-inline-size:0}.swc-UserMessage-attachment--card{gap:var(--swc-user-message-attachment-card-gap, 16px);align-items:center}.swc-UserMessage-attachment--media{flex-direction:column;gap:var(--swc-user-message-attachment-media-gap, 8px);inline-size:180px;min-inline-size:150px;max-inline-size:210px;block-size:180px;min-block-size:135px}.swc-UserMessage-thumbnail{min-inline-size:0}.swc-UserMessage-thumbnail ::slotted(*){display:block}:host([type=\"card\"]) .swc-UserMessage-thumbnail{display:flex;flex-shrink:0;align-items:center;justify-content:center}:host([type=\"card\"]) .swc-UserMessage-thumbnail ::slotted(*){flex-shrink:0;inline-size:32px;block-size:32px;border:1px solid transparent;border-radius:3px;-o-object-fit:cover;object-fit:cover}:host([type=\"media\"]) .swc-UserMessage-thumbnail{position:relative;flex:1 0 0;inline-size:100%;min-block-size:0;background:var(--swc-gray-100);border:1px solid transparent;border-radius:5px;overflow:hidden}:host([type=\"media\"]) .swc-UserMessage-thumbnail ::slotted(*){position:absolute;inset:0;inline-size:100%;block-size:100%;-o-object-fit:cover;object-fit:cover}.swc-UserMessage-meta{display:flex;flex-direction:column;gap:var(--swc-user-message-meta-gap, 2px);min-inline-size:0}:host([type=\"card\"]) .swc-UserMessage-meta{flex:1;align-items:flex-start}:host([type=\"media\"]) .swc-UserMessage-meta{inline-size:100%}.swc-UserMessage-title{font-family:var(--swc-sans-font-family-stack);font-size:var(--swc-font-size-100);font-weight:700;line-height:var(--swc-line-height-font-size-100);color:var(--swc-gray-900)}.swc-UserMessage-subtitle{font-family:var(--swc-sans-font-family-stack);font-size:var(--swc-font-size-75);font-weight:400;line-height:var(--swc-line-height-font-size-75);color:var(--swc-gray-800);text-overflow:ellipsis}:host([type=\"card\"]) .swc-UserMessage-title,:host([type=\"card\"]) .swc-UserMessage-subtitle,:host([type=\"media\"]) .swc-UserMessage-title{inline-size:100%;min-inline-size:0;text-align:start}:host([type=\"card\"]) .swc-UserMessage-title ::slotted(*),:host([type=\"media\"]) .swc-UserMessage-title ::slotted(*),:host([type=\"card\"]) .swc-UserMessage-subtitle ::slotted(*),:host([type=\"media\"]) .swc-UserMessage-subtitle ::slotted(*){display:block;min-inline-size:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`;

// node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t5 = o5, e9, r5) => {
  const { kind: n5, metadata: i6 } = r5;
  let s4 = globalThis.litPropertyMetadata.get(i6);
  if (void 0 === s4 && globalThis.litPropertyMetadata.set(i6, s4 = /* @__PURE__ */ new Map()), "setter" === n5 && ((t5 = Object.create(t5)).wrapped = true), s4.set(r5.name, t5), "accessor" === n5) {
    const { name: o7 } = r5;
    return { set(r6) {
      const n6 = e9.get.call(this);
      e9.set.call(this, r6), this.requestUpdate(o7, n6, t5, true, r6);
    }, init(e10) {
      return void 0 !== e10 && this.C(o7, void 0, t5, e10), e10;
    } };
  }
  if ("setter" === n5) {
    const { name: o7 } = r5;
    return function(r6) {
      const n6 = this[o7];
      e9.call(this, r6), this.requestUpdate(o7, n6, t5, true, r6);
    };
  }
  throw Error("Unsupported decorator location: " + n5);
};
function n4(t5) {
  return (e9, o7) => "object" == typeof o7 ? r4(t5, e9, o7) : ((t6, e10, o8) => {
    const r5 = e10.hasOwnProperty(o8);
    return e10.constructor.createProperty(o8, t6), r5 ? Object.getOwnPropertyDescriptor(e10, o8) : void 0;
  })(t5, e9, o7);
}

// deps/swc/swc-dist/core/element/define-element.js
function e6(e9, t5) {
  window.__swc && window.__swc.DEBUG && customElements.get(e9) && window.__swc.warn(void 0, `Attempted to redefine <${e9}>. This usually indicates that multiple versions of the same web component were loaded onto a single page.`, "https://opensource.adobe.com/spectrum-web-components/registry-conflicts"), customElements.define(e9, t5);
}

// deps/swc/swc-dist/core/element/version.js
var e7 = "0.1.0";
var t4 = "0.1.0";

// deps/swc/swc-dist/core/utils/get-active-element.js
function e8(e9 = document) {
  var t5;
  let n5 = e9.activeElement;
  for (; !(n5 == null || (t5 = n5.shadowRoot) == null) && t5.activeElement; ) n5 = n5.shadowRoot.activeElement;
  return n5;
}

// deps/swc/swc-dist/core/element/spectrum-element.js
var i5;
function a3(t5) {
  class n5 extends t5 {
    hasVisibleFocusInTree() {
      var t6;
      let n6 = e8(this.getRootNode());
      return (t6 = n6 == null ? void 0 : n6.matches(":focus-visible")) == null ? false : t6;
    }
  }
  return n5;
}
var o6 = class extends a3(i4) {
  get dir() {
    var e9;
    return (e9 = getComputedStyle(this).direction) == null ? "ltr" : e9;
  }
};
if (i5 = o6, i5.VERSION = e7, i5.CORE_VERSION = t4, true) {
  let e9 = {
    default: false,
    accessibility: false,
    api: false
  }, t5 = {
    default: false,
    low: false,
    medium: false,
    high: false,
    deprecation: false
  };
  window.__swc = {
    ...window.__swc,
    DEBUG: true,
    ignoreWarningLocalNames: { ...((s4 = window.__swc) == null ? void 0 : s4.ignoreWarningLocalNames) || {} },
    ignoreWarningTypes: {
      ...e9,
      ...((c4 = window.__swc) == null ? void 0 : c4.ignoreWarningTypes) || {}
    },
    ignoreWarningLevels: {
      ...t5,
      ...((l3 = window.__swc) == null ? void 0 : l3.ignoreWarningLevels) || {}
    },
    issuedWarnings: /* @__PURE__ */ new Set(),
    warn: (e10, t6, n5, { type: r5 = "api", level: i6 = "default", issues: a5 } = {}) => {
      let { localName: o7 = "base" } = e10 || {}, s5 = `${o7}:${r5}:${i6}`;
      if (!window.__swc.verbose && window.__swc.issuedWarnings.has(s5) || window.__swc.ignoreWarningLocalNames[o7] || window.__swc.ignoreWarningTypes[r5] || window.__swc.ignoreWarningLevels[i6]) return;
      window.__swc.issuedWarnings.add(s5);
      let c5 = "";
      a5 && a5.length && (a5.unshift(""), c5 = a5.join("\n    - ") + "\n");
      let l4 = i6 === "deprecation" ? "DEPRECATION NOTICE: " : "", u3 = e10 ? "\nInspect this issue in the follow element:" : "", d3 = (e10 ? "\n\n" : "\n") + n5 + "\n", f3 = [];
      f3.push(l4 + t6 + "\n" + c5 + u3), e10 && f3.push(e10), f3.push(d3, { data: {
        localName: o7,
        type: r5,
        level: i6
      } }), console.warn(...f3);
    }
  }, window.__swc.warn(void 0, "Spectrum Web Components is in dev mode. Not recommended for production!", "https://opensource.adobe.com/spectrum-web-components/dev-mode/", { type: "default" });
}
var s4;
var c4;
var l3;

// deps/swc/swc-dist/patterns/conversational-ai/user-message/UserMessage.js
var a4 = class extends o6 {
  constructor(...e9) {
    super(...e9), this.type = "copy";
  }
  static get styles() {
    return [t3];
  }
  render() {
    return this.type === "copy" ? b2`
          <slot></slot>
        ` : b2`
          <div
            class="swc-UserMessage-attachment swc-UserMessage-attachment--${this.type}"
          >
            <div class="swc-UserMessage-thumbnail">
              <slot name="thumbnail"></slot>
            </div>
            <div class="swc-UserMessage-meta">
              <div class="swc-UserMessage-title">
                <slot name="title"></slot>
              </div>
              <div class="swc-UserMessage-subtitle">
                <slot name="subtitle"></slot>
              </div>
            </div>
          </div>
        `;
  }
};
e([n4({
  type: String,
  reflect: true
})], a4.prototype, "type", void 0);

// deps/swc/swc-dist/patterns/conversational-ai/user-message/index.js
e6("swc-user-message", a4);
export {
  a4 as UserMessage
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
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
