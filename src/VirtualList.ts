type Getter = (element: HTMLElement) => number;

const sizeGetters = {
    vertical: (element: HTMLElement) => element.offsetHeight,
    horizental: (element: HTMLElement) => element.offsetWidth
};
const positionGetters = {
    vertical: (element: HTMLElement) => element.offsetTop,
    horizental: (element: HTMLElement) => element.offsetLeft
};

export class VirtualList {
    private startIndex!: number | null;
    private endIndex!: number | null;
    private itemDetails: {
        index: number;
        pos: number;
        size: number;
    }[] = [];

    private itemSizeGetter!: Getter;
    private itemPositionGetter!: Getter;

    constructor(
        public readonly itemSize: number,
        public readonly bufferCount: number,
        public readonly remainItemCountToTriggerReachTailEvent = 0,
        public readonly verticalLayout = true
    ) {
        if (verticalLayout) {
            this.itemSizeGetter = sizeGetters.vertical;
            this.itemPositionGetter = positionGetters.vertical;
        } else {
            this.itemSizeGetter = sizeGetters.horizental;
            this.itemPositionGetter = positionGetters.horizental;
        }
    }

    updateItem(index: number, element: HTMLElement) {
        this.itemDetails[index] = {
            index,
            pos: this.itemPositionGetter(element),
            size: this.itemSizeGetter(element)
        };
    }

    compute(
        containerSize: number,
        scrollPosition: number,
        totalItemsCount: number,
        renderedItemElements: HTMLElement[]
    ) {
        let startIndex!: number;
        let endIndex!: number;
        let paddingTail!: number;
        let shouldUpdate = false;
        let reachTail = false;

        if (totalItemsCount === 0) {
            this.startIndex = null;
            this.endIndex = null;
            return {
                startIndex: 0,
                endIndex: 0,
                paddingTail: 0,
                paddingHead: 0,
                shouldUpdate: false,
                reachTail: false
            };
        }

        if (this.startIndex == null && this.endIndex == null) {
            return this.computeFirstRender(containerSize, totalItemsCount);
        }

        renderedItemElements.forEach((elem, i) => {
            const idx = (this.startIndex as number) + i;
            if (this.itemDetails[idx]) {
                return;
            }
            this.updateItem(idx, elem);
        });

        const bottom = scrollPosition + containerSize;
        const itemLength = this.itemDetails.length;

        for (let i = 0; i < itemLength; i++) {
            const itemDetail = this.itemDetails[i];
            if (itemDetail.pos <= scrollPosition) {
                startIndex = i;
            } else if (itemDetail.pos > bottom && endIndex == null) {
                endIndex = i;
                break;
            }
        }

        if (endIndex == null) {
            endIndex = itemLength;
        }

        startIndex = Math.max(0, startIndex - this.bufferCount);
        endIndex = Math.min(totalItemsCount - 1, endIndex + this.bufferCount);
        const paddingHead = this.itemDetails[startIndex].pos;

        if (endIndex > itemLength - 1) {
            paddingTail = (totalItemsCount - endIndex - 1) * this.itemSize;
        } else {
            paddingTail = (totalItemsCount - itemLength) * this.itemSize;
            for (let j = endIndex + 1; j < itemLength; j++) {
                paddingTail += this.itemDetails[j].size;
            }
        }

        if (this.startIndex !== startIndex || this.endIndex !== endIndex) {
            shouldUpdate = true;
            this.startIndex = startIndex;
            this.endIndex = endIndex;
        }

        reachTail = totalItemsCount - (endIndex + 1) <= this.remainItemCountToTriggerReachTailEvent;

        return {
            startIndex,
            endIndex,
            paddingHead,
            paddingTail,
            shouldUpdate,
            reachTail
        };
    }

    private computeFirstRender(containerSize: number, totalCount: number) {
        const startIndex = 0;
        const visibleCount = Math.ceil(containerSize / this.itemSize);
        const endIndex = Math.min(this.bufferCount + visibleCount, totalCount);
        const renderCount = endIndex - startIndex;
        const paddingHead = 0;
        const paddingTail = (totalCount - renderCount) * this.itemSize;

        this.startIndex = startIndex;
        this.endIndex = endIndex;

        return {
            startIndex,
            endIndex,
            paddingHead,
            paddingTail,
            shouldUpdate: true,
            reachTail: false
        };
    }

    reset() {
        this.startIndex = null;
        this.endIndex = null;
        this.itemDetails = [];
    }
}
