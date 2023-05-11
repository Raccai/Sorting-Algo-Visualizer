
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    // Needs to be written like this to pass the tree-shake-test
    'WeakMap' in globals ? new WeakMap() : undefined;
    function append(target, node) {
        target.appendChild(node);
    }
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_empty_stylesheet(node) {
        const style_element = element('style');
        append_stylesheet(get_root_for_style(node), style_element);
        return style_element.sheet;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
        return style.sheet;
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    // we need to store the information for multiple documents because a Svelte application could also contain iframes
    // https://github.com/sveltejs/svelte/issues/3624
    const managed_styles = new Map();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_style_information(doc, node) {
        const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
        managed_styles.set(doc, info);
        return info;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = get_root_for_style(node);
        const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
        if (!rules[name]) {
            rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            managed_styles.forEach(info => {
                const { ownerNode } = info.stylesheet;
                // there is no ownerNode if it runs on jsdom.
                if (ownerNode)
                    detach(ownerNode);
            });
            managed_styles.clear();
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function fix_and_destroy_block(block, lookup) {
        block.f();
        destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        const updates = [];
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                // defer updates until all the DOM shuffling is done
                updates.push(() => block.p(child_ctx, dirty));
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        run_all(updates);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }

    const _boolean_attributes = [
        'allowfullscreen',
        'allowpaymentrequest',
        'async',
        'autofocus',
        'autoplay',
        'checked',
        'controls',
        'default',
        'defer',
        'disabled',
        'formnovalidate',
        'hidden',
        'inert',
        'ismap',
        'loop',
        'multiple',
        'muted',
        'nomodule',
        'novalidate',
        'open',
        'playsinline',
        'readonly',
        'required',
        'reversed',
        'selected'
    ];
    /**
     * List of HTML boolean attributes (e.g. `<input disabled>`).
     * Source: https://html.spec.whatwg.org/multipage/indices.html
     */
    new Set([..._boolean_attributes]);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }
    function sineInOut(t) {
        return -0.5 * (Math.cos(Math.PI * t) - 1);
    }

    function flip(node, { from, to }, params = {}) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const [ox, oy] = style.transformOrigin.split(' ').map(parseFloat);
        const dx = (from.left + from.width * ox / to.width) - (to.left + ox);
        const dy = (from.top + from.height * oy / to.height) - (to.top + oy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(Math.sqrt(dx * dx + dy * dy)) : duration,
            easing,
            css: (t, u) => {
                const x = u * dx;
                const y = u * dy;
                const sx = t + u * from.width / to.width;
                const sy = t + u * from.height / to.height;
                return `transform: ${transform} translate(${x}px, ${y}px) scale(${sx}, ${sy});`;
            }
        };
    }

    /* src\App.svelte generated by Svelte v3.59.1 */

    const { Object: Object_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[30] = list[i];
    	child_ctx[32] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[33] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[39] = list[i];
    	return child_ctx;
    }

    // (184:4) {#each algos as algo}
    function create_each_block_3(ctx) {
    	let option;
    	let t0_value = /*algo*/ ctx[39].algo + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = /*algo*/ ctx[39];
    			option.value = option.__value;
    			add_location(option, file, 184, 5, 4018);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(184:4) {#each algos as algo}",
    		ctx
    	});

    	return block;
    }

    // (191:4) {#each sizes as size}
    function create_each_block_2(ctx) {
    	let option;
    	let t0_value = /*size*/ ctx[36].size + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = /*size*/ ctx[36];
    			option.value = option.__value;
    			add_location(option, file, 191, 5, 4218);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(191:4) {#each sizes as size}",
    		ctx
    	});

    	return block;
    }

    // (198:4) {#each speeds as speed}
    function create_each_block_1(ctx) {
    	let option;
    	let t0_value = /*speed*/ ctx[33].speed + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = /*speed*/ ctx[33];
    			option.value = option.__value;
    			add_location(option, file, 198, 5, 4370);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(198:4) {#each speeds as speed}",
    		ctx
    	});

    	return block;
    }

    // (212:3) {#each shuffledArray as item, index (item)}
    function create_each_block(key_1, ctx) {
    	let div;
    	let rect;
    	let stop_animation = noop;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "id", "bars");

    			set_style(div, "background", /*index*/ ctx[32] === /*_i*/ ctx[2] || /*index*/ ctx[32] === /*_j*/ ctx[3]
    			? '#FE6172'
    			: '#92a1d6');

    			set_style(div, "height", /*item*/ ctx[30] + "px");
    			set_style(div, "width", /*styles*/ ctx[13].width + "px");
    			attr_dev(div, "class", "svelte-1z0vi0s");
    			add_location(div, file, 212, 4, 4792);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*shuffledArray, _i, _j*/ 13) {
    				set_style(div, "background", /*index*/ ctx[32] === /*_i*/ ctx[2] || /*index*/ ctx[32] === /*_j*/ ctx[3]
    				? '#FE6172'
    				: '#92a1d6');
    			}

    			if (dirty[0] & /*shuffledArray*/ 1) {
    				set_style(div, "height", /*item*/ ctx[30] + "px");
    			}
    		},
    		r: function measure() {
    			rect = div.getBoundingClientRect();
    		},
    		f: function fix() {
    			fix_position(div);
    			stop_animation();
    		},
    		a: function animate() {
    			stop_animation();
    			stop_animation = create_animation(div, rect, flip, { duration: 100, easing: sineInOut });
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(212:3) {#each shuffledArray as item, index (item)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div3;
    	let div1;
    	let select0;
    	let t0;
    	let select1;
    	let t1;
    	let select2;
    	let t2;
    	let button0;
    	let t3;
    	let t4;
    	let button1;
    	let t5;
    	let t6;
    	let div0;
    	let p0;
    	let t7;
    	let t8;
    	let t9;
    	let p1;
    	let t10;
    	let t11;
    	let t12;
    	let div2;
    	let each_blocks = [];
    	let each3_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value_3 = /*algos*/ ctx[10];
    	validate_each_argument(each_value_3);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*sizes*/ ctx[12];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*speeds*/ ctx[11];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*shuffledArray*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*item*/ ctx[30];
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each3_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			div3 = element("div");
    			div1 = element("div");
    			select0 = element("select");

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t0 = space();
    			select1 = element("select");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t1 = space();
    			select2 = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t2 = space();
    			button0 = element("button");
    			t3 = text("Sort");
    			t4 = space();
    			button1 = element("button");
    			t5 = text("New Array");
    			t6 = space();
    			div0 = element("div");
    			p0 = element("p");
    			t7 = text("Compares: ");
    			t8 = text(/*compares*/ ctx[7]);
    			t9 = space();
    			p1 = element("p");
    			t10 = text("Swaps: ");
    			t11 = text(/*swaps*/ ctx[8]);
    			t12 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			select0.disabled = /*isDisabled*/ ctx[1];
    			attr_dev(select0, "class", "svelte-1z0vi0s");
    			if (/*selectedAlgo*/ ctx[4] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[16].call(select0));
    			add_location(select0, file, 182, 3, 3930);
    			select1.disabled = /*isDisabled*/ ctx[1];
    			attr_dev(select1, "class", "svelte-1z0vi0s");
    			if (/*selectedSize*/ ctx[6] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[17].call(select1));
    			add_location(select1, file, 189, 3, 4101);
    			attr_dev(select2, "class", "svelte-1z0vi0s");
    			if (/*selectedSpeed*/ ctx[5] === void 0) add_render_callback(() => /*select2_change_handler*/ ctx[18].call(select2));
    			add_location(select2, file, 196, 3, 4301);
    			button0.disabled = /*isDisabled*/ ctx[1];
    			attr_dev(button0, "class", "svelte-1z0vi0s");
    			add_location(button0, file, 203, 3, 4456);
    			button1.disabled = /*isDisabled*/ ctx[1];
    			attr_dev(button1, "class", "svelte-1z0vi0s");
    			add_location(button1, file, 204, 3, 4519);
    			attr_dev(p0, "class", "svelte-1z0vi0s");
    			add_location(p0, file, 206, 4, 4622);
    			attr_dev(p1, "class", "svelte-1z0vi0s");
    			add_location(p1, file, 207, 4, 4654);
    			attr_dev(div0, "class", "data svelte-1z0vi0s");
    			add_location(div0, file, 205, 3, 4599);
    			attr_dev(div1, "class", "inputs");
    			add_location(div1, file, 181, 2, 3906);
    			attr_dev(div2, "class", "display svelte-1z0vi0s");
    			attr_dev(div2, "style", /*cssVarStyles*/ ctx[9]);
    			add_location(div2, file, 210, 2, 4697);
    			attr_dev(div3, "class", "container svelte-1z0vi0s");
    			add_location(div3, file, 180, 1, 3880);
    			add_location(main, file, 179, 0, 3872);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div3);
    			append_dev(div3, div1);
    			append_dev(div1, select0);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				if (each_blocks_3[i]) {
    					each_blocks_3[i].m(select0, null);
    				}
    			}

    			select_option(select0, /*selectedAlgo*/ ctx[4], true);
    			append_dev(div1, t0);
    			append_dev(div1, select1);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(select1, null);
    				}
    			}

    			select_option(select1, /*selectedSize*/ ctx[6], true);
    			append_dev(div1, t1);
    			append_dev(div1, select2);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(select2, null);
    				}
    			}

    			select_option(select2, /*selectedSpeed*/ ctx[5], true);
    			append_dev(div1, t2);
    			append_dev(div1, button0);
    			append_dev(button0, t3);
    			append_dev(div1, t4);
    			append_dev(div1, button1);
    			append_dev(button1, t5);
    			append_dev(div1, t6);
    			append_dev(div1, div0);
    			append_dev(div0, p0);
    			append_dev(p0, t7);
    			append_dev(p0, t8);
    			append_dev(div0, t9);
    			append_dev(div0, p1);
    			append_dev(p1, t10);
    			append_dev(p1, t11);
    			append_dev(div3, t12);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div2, null);
    				}
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[16]),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[17]),
    					listen_dev(select1, "change", /*getShuffledArray*/ ctx[14], false, false, false, false),
    					listen_dev(select2, "change", /*select2_change_handler*/ ctx[18]),
    					listen_dev(button0, "click", /*sort*/ ctx[15], false, false, false, false),
    					listen_dev(button1, "click", /*getShuffledArray*/ ctx[14], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*algos*/ 1024) {
    				each_value_3 = /*algos*/ ctx[10];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_3(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_3.length;
    			}

    			if (dirty[0] & /*isDisabled*/ 2) {
    				prop_dev(select0, "disabled", /*isDisabled*/ ctx[1]);
    			}

    			if (dirty[0] & /*selectedAlgo, algos*/ 1040) {
    				select_option(select0, /*selectedAlgo*/ ctx[4]);
    			}

    			if (dirty[0] & /*sizes*/ 4096) {
    				each_value_2 = /*sizes*/ ctx[12];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty[0] & /*isDisabled*/ 2) {
    				prop_dev(select1, "disabled", /*isDisabled*/ ctx[1]);
    			}

    			if (dirty[0] & /*selectedSize, sizes*/ 4160) {
    				select_option(select1, /*selectedSize*/ ctx[6]);
    			}

    			if (dirty[0] & /*speeds*/ 2048) {
    				each_value_1 = /*speeds*/ ctx[11];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select2, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*selectedSpeed, speeds*/ 2080) {
    				select_option(select2, /*selectedSpeed*/ ctx[5]);
    			}

    			if (dirty[0] & /*isDisabled*/ 2) {
    				prop_dev(button0, "disabled", /*isDisabled*/ ctx[1]);
    			}

    			if (dirty[0] & /*isDisabled*/ 2) {
    				prop_dev(button1, "disabled", /*isDisabled*/ ctx[1]);
    			}

    			if (dirty[0] & /*compares*/ 128) set_data_dev(t8, /*compares*/ ctx[7]);
    			if (dirty[0] & /*swaps*/ 256) set_data_dev(t11, /*swaps*/ ctx[8]);

    			if (dirty[0] & /*shuffledArray, _i, _j, styles*/ 8205) {
    				each_value = /*shuffledArray*/ ctx[0];
    				validate_each_argument(each_value);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each3_lookup, div2, fix_and_destroy_block, create_each_block, null, get_each_context);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    			}

    			if (dirty[0] & /*cssVarStyles*/ 512) {
    				attr_dev(div2, "style", /*cssVarStyles*/ ctx[9]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let cssVarStyles;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let shuffledArray = [];
    	let isDone = false;
    	let isDisabled = false;
    	let _i, _j;
    	let selectedAlgo, selectedSpeed, selectedSize;
    	let compares = 0;
    	let swaps = 0;

    	let algos = [
    		{ id: 1, algo: "Bubble Sort" },
    		{ id: 2, algo: "Insertion Sort" },
    		{ id: 3, algo: "Quick Sort" },
    		{ id: 4, algo: "Selection Sort" }
    	];

    	let speeds = [
    		{ id: 1, speed: "1.00x" },
    		{ id: 0.4, speed: "3.00x" },
    		{ id: 0.2, speed: "5.00x" },
    		{ id: 0.1, speed: "10.00x" }
    	];

    	let sizes = [
    		{ id: 5, size: "5" },
    		{ id: 10, size: "10" },
    		{ id: 30, size: "30" },
    		{ id: 50, size: "50" },
    		{ id: 100, size: "100" },
    		{ id: 150, size: "150" }
    	];

    	let styles = {
    		height: 500,
    		width: 1000,
    		width2: shuffledArray.length
    	};

    	// IS CALLED TO GET A NEW ARRAY
    	function getShuffledArray() {
    		$$invalidate(0, shuffledArray = []);

    		for (let i = 0; i < selectedSize.id; i++) {
    			$$invalidate(0, shuffledArray[i] = Math.random() * (styles.height - 20 + 1) + 10, shuffledArray);
    		}
    	}

    	// SELECTION SORT
    	async function selection() {
    		let n = shuffledArray.length;

    		for (let step = 0; step < n - 1; step++) {
    			let minVal = step;

    			for (let i = step + 1; i < n; i++) {
    				if (compare(shuffledArray[minVal], shuffledArray[i], 1)) {
    					minVal = i;
    					await sleep(1000);
    				}
    			}

    			swap(step, minVal, 1);
    			await sleep(1000);
    		}

    		done();
    	}

    	// QUICK SORT
    	async function quick() {
    		async function split(start, end) {
    			if (start === end) return;
    			let pivot = shuffledArray[end];
    			let i = start - 1;

    			for (let j = start; j < end; j++) {
    				if (compare(pivot, shuffledArray[j], 2)) {
    					// await i;
    					i++;

    					swap(i, j, 2);
    					await sleep(1000);
    				}
    			}

    			swap(i + 1, end, 2);
    			await sleep(1000);
    			return i + 1;
    		}

    		async function sort(start, end) {
    			if (start < end) {
    				const j = await split(start, end);
    				await sort(start, j - 1);
    				await sort(j + 1, end);
    			}
    		}

    		await sort(0, shuffledArray.length - 1);
    		done();
    	}

    	// INSERTION SORT
    	async function insertion() {
    		for (let i = 1; i < shuffledArray.length; i++) {
    			let currenVal = shuffledArray[i];
    			let j;

    			for (j = i - 1; j >= 0 && compare(shuffledArray[j], currenVal, 2); j--) {
    				swap(j + 1, j, 2);
    				await sleep(1000);
    			}

    			$$invalidate(0, shuffledArray[j + 1] = currenVal, shuffledArray);
    		}

    		done();
    	}

    	// BUBBLE SORT
    	async function bubble() {
    		for (let i = 0; i < shuffledArray.length - 1; i++) {
    			for (let j = i; j < shuffledArray.length; j++) {
    				if (compare(shuffledArray[i], shuffledArray[j], 2)) {
    					swap(i, j, 2);
    					await sleep(1500);
    				}
    			}
    		}

    		done();
    	}

    	//HELPER FUNCTIONS
    	function mark(i, j) {
    		$$invalidate(2, _i = shuffledArray.indexOf(i));
    		$$invalidate(3, _j = shuffledArray.indexOf(j));
    	}

    	function mark2(i, j) {
    		$$invalidate(2, _i = i);
    		$$invalidate(3, _j = j);
    	}

    	function swap(i, j, markVal) {
    		if (markVal === 1) mark(i, j); else mark2(i, j);
    		const temp = shuffledArray[i];
    		$$invalidate(0, shuffledArray[i] = shuffledArray[j], shuffledArray);
    		$$invalidate(0, shuffledArray[j] = temp, shuffledArray);
    		$$invalidate(8, swaps++, swaps);
    	}

    	function compare(i, j, markVal) {
    		if (markVal === 1) mark(i, j); else mark2(i, j);
    		$$invalidate(7, compares++, compares);

    		if (i > j) {
    			return true;
    		}

    		return false;
    	}

    	//ALGORITHM CALL TO SORT
    	const sort = () => {
    		$$invalidate(7, compares = 0);
    		$$invalidate(8, swaps = 0);
    		$$invalidate(1, isDisabled = true);
    		if (selectedAlgo.id === 1) bubble();
    		if (selectedAlgo.id === 2) insertion();
    		if (selectedAlgo.id === 3) quick();
    		if (selectedAlgo.id === 4) selection();
    	};

    	// IS CALLED WHEN AN ALGO FINISHES
    	const done = () => {
    		$$invalidate(1, isDisabled = false);
    		isDone = true;
    	};

    	// USED TO PAUSE AND SHOW ANIMATIONS
    	const sleep = time => {
    		return new Promise(resolve => setTimeout(resolve, selectedSpeed.id * time));
    	};

    	// CALLED WHEN FIRST RUN
    	onMount(async () => {
    		getShuffledArray();
    	});

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function select0_change_handler() {
    		selectedAlgo = select_value(this);
    		$$invalidate(4, selectedAlgo);
    		$$invalidate(10, algos);
    	}

    	function select1_change_handler() {
    		selectedSize = select_value(this);
    		$$invalidate(6, selectedSize);
    		$$invalidate(12, sizes);
    	}

    	function select2_change_handler() {
    		selectedSpeed = select_value(this);
    		$$invalidate(5, selectedSpeed);
    		$$invalidate(11, speeds);
    	}

    	$$self.$capture_state = () => ({
    		flip,
    		sineInOut,
    		onMount,
    		shuffledArray,
    		isDone,
    		isDisabled,
    		_i,
    		_j,
    		selectedAlgo,
    		selectedSpeed,
    		selectedSize,
    		compares,
    		swaps,
    		algos,
    		speeds,
    		sizes,
    		styles,
    		getShuffledArray,
    		selection,
    		quick,
    		insertion,
    		bubble,
    		mark,
    		mark2,
    		swap,
    		compare,
    		sort,
    		done,
    		sleep,
    		cssVarStyles
    	});

    	$$self.$inject_state = $$props => {
    		if ('shuffledArray' in $$props) $$invalidate(0, shuffledArray = $$props.shuffledArray);
    		if ('isDone' in $$props) isDone = $$props.isDone;
    		if ('isDisabled' in $$props) $$invalidate(1, isDisabled = $$props.isDisabled);
    		if ('_i' in $$props) $$invalidate(2, _i = $$props._i);
    		if ('_j' in $$props) $$invalidate(3, _j = $$props._j);
    		if ('selectedAlgo' in $$props) $$invalidate(4, selectedAlgo = $$props.selectedAlgo);
    		if ('selectedSpeed' in $$props) $$invalidate(5, selectedSpeed = $$props.selectedSpeed);
    		if ('selectedSize' in $$props) $$invalidate(6, selectedSize = $$props.selectedSize);
    		if ('compares' in $$props) $$invalidate(7, compares = $$props.compares);
    		if ('swaps' in $$props) $$invalidate(8, swaps = $$props.swaps);
    		if ('algos' in $$props) $$invalidate(10, algos = $$props.algos);
    		if ('speeds' in $$props) $$invalidate(11, speeds = $$props.speeds);
    		if ('sizes' in $$props) $$invalidate(12, sizes = $$props.sizes);
    		if ('styles' in $$props) $$invalidate(13, styles = $$props.styles);
    		if ('cssVarStyles' in $$props) $$invalidate(9, cssVarStyles = $$props.cssVarStyles);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$invalidate(9, cssVarStyles = Object.entries(styles).map(([key, value]) => `--${key}:${value}`).join(';'));

    	return [
    		shuffledArray,
    		isDisabled,
    		_i,
    		_j,
    		selectedAlgo,
    		selectedSpeed,
    		selectedSize,
    		compares,
    		swaps,
    		cssVarStyles,
    		algos,
    		speeds,
    		sizes,
    		styles,
    		getShuffledArray,
    		sort,
    		select0_change_handler,
    		select1_change_handler,
    		select2_change_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
