function Shuffle(cards) {

    var positions = [];
    var size = cards.length;

    for (let i = 0; i < size; i++) {
        var n = Math.floor(Math.random() * (size));
        var check = positions.includes(n);

        if (check === false) {
            positions.push(n);
        }
        else {
            while (check === true) {
                n = Math.floor(Math.random() * (size));
                check = positions.includes(n);
                if (check === false) {
                    positions.push(n);
                }
            }
        }
    }

    var shuffledCards = positions.map( pos => cards[pos]);

    return shuffledCards;
}

export default Shuffle;