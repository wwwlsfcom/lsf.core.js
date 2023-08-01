const {Queue} = require('../src/Queue')

it("测试Queue", function () {
    const queue = new Queue()
    expect(queue.isEmpty()).toBe(true)

    queue.enqueue("a");
    queue.enqueue("b");

    const v = queue.dequeue()

    expect(v).toBe("a")

})
