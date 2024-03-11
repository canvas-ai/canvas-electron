// https://github.com/davidfig/tree

const data = {
    children: [
        { name: 'fruits', children: [
            { name: 'apples', children: [] },
            { name: 'oranges', children: [
                { name: 'tangerines', children: [] },
                { name: 'mandarins', children: [] },
                { name: 'pomelo', children: [] },
                { name: 'blood orange', children: [] },
            ] }
        ]},
        { name: 'vegetables', children: [
            { name: 'brocolli', children: [] },
        ] },
    ]
}

//const tree = new Tree(data, { parent: document.body })

const container = document.querySelector("#context.tree")


const tree = new Tree(data, { parent: container })
