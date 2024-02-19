const bitmap = {}

class Timeline {

    constructor() {}

    today() {
        return bitmap(20211226)

    }
    yesterday() {
        return bitmap(20211226 - 1)
    }
    tomorrow() {
        return bitmap(20211226 + 1)
    }

    thisWeek() {
        return bitmap(54)
    }
    lastWeek() {
        return bitmap(54-1)
    }

    thisMonth() {
        // keep N months
        // off-thread cleanup of old bitmaps on month change
        return bitmap(202112)
    }
    thisYear() {
        return bitmap(2021)
    }

    bce() {}
    bc() { return this.bce() }
    ace() {}
    ac() { return this.ace() }

    add() {

    }

    /**
     * # Example URL time-range inputs
     * #t-1y
     * #t+92d
     * #t1980
     * #t1980+
     * #t1980-2011
     * #ttoday
     * #tlast-week || tlastWeek
     * @param {*} t1
     * @param {*} t2
     */
    byRange(t1, t2) {}

    timestamp() {

    }

    parseDateTimeString(str) {

    }

}

module.exports = Timeline
