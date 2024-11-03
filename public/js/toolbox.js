class Toolbox {
    constructor() {
        this.window = document.getElementById('toolbox');
        this.mode = 'default';
    }

    show() {
        this.window.style.display = 'block';
    }

    hide() {
        this.window.style.display = 'none';
    }

    setMode(mode) {
        this.window.classList.remove('panel', 'default', 'extended');
        this.window.classList.add(mode);
        this.mode = mode;
    }

    toggleMode() {
        const modes = ['panel', 'default', 'extended'];
        const currentIndex = modes.indexOf(this.mode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.setMode(modes[nextIndex]);
    }

    registerGlobalShortcut() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'c' && event.shiftKey && (event.metaKey || event.ctrlKey)) {
                if (this.window.style.display === 'none' || this.window.style.display === '') {
                    this.show();
                } else {
                    this.hide();
                }
            }
        });
    }
}

const toolbox = new Toolbox();
toolbox.registerGlobalShortcut();
