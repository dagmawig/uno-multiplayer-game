import './App.css';
import { Component } from 'react';
import Shuffle from './components/shuffle';
import socketIOClient from 'socket.io-client';


const serverPort = 'https://uno-server.glitch.me';

const fullDeck = [
  'b+2', 'b+2', 'b0', 'b1', 'b1', 'b2', 'b2', 'b3', 'b3', 'b4', 'b4', 'b5', 'b5', 'b6', 'b6', 'b7', 'b7', 'b8', 'b8', 'b9', 'b9', 'brev', 'brev', 'bskip', 'bskip',
  'g+2', 'g+2', 'g0', 'g1', 'g1', 'g2', 'g2', 'g3', 'g3', 'g4', 'g4', 'g5', 'g5', 'g6', 'g6', 'g7', 'g7', 'g8', 'g8', 'g9', 'g9', 'grev', 'grev', 'gskip', 'gskip',
  'r+2', 'r+2', 'r0', 'r1', 'r1', 'r2', 'r2', 'r3', 'r3', 'r4', 'r4', 'r5', 'r5', 'r6', 'r6', 'r7', 'r7', 'r8', 'r8', 'r9', 'r9', 'rrev', 'rrev', 'rskip', 'rskip',
  'y+2', 'y+2', 'y0', 'y1', 'y1', 'y2', 'y2', 'y3', 'y3', 'y4', 'y4', 'y5', 'y5', 'y6', 'y6', 'y7', 'y7', 'y8', 'y8', 'y9', 'y9', 'yrev', 'yrev', 'yskip', 'yskip',
  'wild', 'wild', 'wild', 'wild',
  'wild+4', 'wild+4', 'wild+4', 'wild+4'
];

const shuffledDeck = Shuffle(fullDeck);

const initialState = {
  hand: [], deck: [], turn: null, direction: 1, potCards: [], draw: 0, potColor: '', playCard: [], name: '', order: null, players: [], ID: null, gameServer: false, deal: true, gameOn: false, UNO: false, winner: null, connecting: false
};


class App extends Component {

  constructor(props) {
    super(props);
    this.state = initialState;
    this.deal = this.deal.bind(this);
    this.play = this.play.bind(this);
    this.playCard = this.playCard.bind(this);
    this.checkColor = this.checkColor.bind(this);
    this.cardInfo = this.cardInfo.bind(this);
    this.updateColor = this.updateColor.bind(this);
    this.draw = this.draw.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.start = this.start.bind(this);
    this.reset = this.reset.bind(this);
  }

  // to reset the gamge after a player wins
  reset() {
    this.setState({
      hand: [...Array(this.state.players.length)].map(i => []), deck: [], turn: null, direction: 1, potCards: [], draw: 0, potColor: '', playCard: [], deal: true, gameOn: false, UNO: false, winner: null
    },
      () => {
        this.socket.emit('updateState', { hand: this.state.hand, deck: this.state.deck, turn: this.state.turn, direction: this.state.direction, potCards: this.state.potCards, draw: this.state.draw, potColor: this.state.potColor, playCard: this.state.playCard, deal: this.state.deal, gameOn: this.state.gameOn, UNO: this.state.UNO, winner: this.state.winner })
      });
  }

  // to handle joining game server
  handleSubmit(e) {
    let name = this.state.name;
    if (!name.split(' ').join('')) {
      alert('name field is empty');
      return;
    }

    this.socket = socketIOClient(serverPort);
    this.setState({ connecting: true });
    this.socket.on('join', message => {
      if (message === false) {
        alert('game session is on. \n can not currently join server');
        this.socket = null;
        return;
      }
      else {
        this.socket.emit('name', name);
        this.socket.on('usersInfo', userInfo => {
          this.setState({ order: userInfo[0], players: userInfo[1], ID: userInfo[2], hand: userInfo[3] });
          this.setState({ gameServer: true, connecting: false })
        });
        this.socket.on('newUser', newUser => {
          this.setState({ players: newUser[0], hand: newUser[1] });
        });
        this.socket.on('lostUser', lostUser => {
          alert(`${this.state.players[lostUser[2]]} lost connection. Resetting game.`)
          this.setState({ players: lostUser[0], hand: lostUser[1] });
          this.setState({
            deck: [], turn: null, direction: 1, potCards: [], draw: 0, potColor: '', playCard: [], deal: true, gameOn: false, UNO: false, winner: null
          });
        });
        this.socket.on('updateOrder', order => {
          this.setState({ order: order });
        });
        this.socket.on('updateState', (updatedState) => {
          this.setState((state) => ({ ...state, ...updatedState }), () => { if (this.state.turn === this.state.order && 'turn' in updatedState) alert('It is your turn!') });
        });
        // this.socket.on('disconnect', () => {
        //   this.socket = null;
        //   this.setState({...initialState});
        // });
      }
    })


    e.preventDefault();
  }

  // for dealer to start the game after all players join server.
  start() {
    if (this.state.players.length < 2) alert("To start the game, you need at least one friend to join the server.");
    else {
      this.setState({ gameOn: true, deck: shuffledDeck },
        () => {
          this.socket.emit('updateState', { gameOn: this.state.gameOn, deck: this.state.deck })
        });
    }
  }

  // to handle dealer dealing cards at the start of the game
  deal() {
    let copyDeck = this.state.deck;
    let player = this.state.players.length;
    let hand = this.state.hand;

    var i = 0;
    var dealInterval = setInterval(() => {
      i++;
      for (let j = 0; j < player; j++) {
        hand[j].push(copyDeck[j + i * player]);
      }
      this.setState({ hand: hand },
        () => { this.socket.emit('updateState', { hand: this.state.hand }) });
      if (i >= 7) {
        let updatedDeck = copyDeck.slice(7 * player);

        this.setState({ deck: updatedDeck, turn: 1, deal: false },
          () => { this.socket.emit('updateState', { deck: this.state.deck, turn: this.state.turn }) });
        clearInterval(dealInterval);
      }

    }, 1000)


  }

  // to handle a player playing a card
  playCard(e) {
    if (parseInt(e.target.dataset.player) !== this.state.turn) {
      alert(`Slow down! It's not your turn!!`);
    }
    else {
      let valArr = [e.target.dataset.value, parseInt(e.target.dataset.index)];
      this.setState({ playCard: valArr }, () => { window.$('#playModal').modal('show'); });
    }
  }

  // to handle the response to a player playing a card
  play(e) {
    let value = this.state.playCard[0];
    let cardIndex = this.state.playCard[1];
    let playCard = this.cardInfo(value);
    let colorCheck = this.checkColor(playCard);
    let player = this.state.players.length;

    if (colorCheck) {
      if (this.state.draw !== 0 && playCard.type !== '+2' && playCard.type !== 'wild+4') {
        alert(`You have to draw ${this.state.draw} cards SUCKER!!`);
      }
      else {
        let turn = this.state.turn;
        let hand = this.state.hand;
        let playerHand = this.state.hand[turn];
        playerHand.splice(cardIndex, 1);
        hand[turn] = playerHand;
        if ((playerHand.length === 1 && !this.state.UNO) || (playerHand.length > 1 && this.state.UNO)) {
          this.draw(null, 5);
        }
        else if (playerHand.length === 0) {
          this.setState((state) => ({ winner: state.name }),
            () => {
              this.socket.emit('updateState', { winner: this.state.name })
            });
          return;
        }
        if (playCard.type === 'regular') {
          this.setState((state) => ({ hand: hand, turn: Math.abs(state.turn + state.direction) % player, potCards: [state.potCards, value], potColor: playCard.color }),
            () => { this.socket.emit('updateState', { hand: this.state.hand, turn: this.state.turn, potCards: this.state.potCards, potColor: this.state.potColor }) });
        }
        else if (playCard.type === 'rev') {
          if (player === 2) {
            this.setState((state) => ({ hand: hand, turn: Math.abs(state.turn + 2 * state.direction) % player, potCards: [state.potCards, value], potColor: playCard.color }),
              () => { this.socket.emit('updateState', { hand: this.state.hand, turn: this.state.turn, potCards: this.state.potCards, potColor: this.state.potColor }) });
          }
          else {
            this.setState((state) => ({ hand: hand, trun: Math.abs(state.turn - state.direction) % player, direction: -1 * state.direction, potCards: [state.potCards, value], potColor: playCard.color }),
              () => { this.socket.emit('updateState', { hand: this.state.hand, turn: this.state.turn, direction: this.state.direction, potCards: this.state.potCards, potColor: this.state.potColor }) });
          }
        }
        else if (playCard.type === 'skip') {
          this.setState((state) => ({ hand: hand, trun: Math.abs(state.turn + 2 * state.direction) % player, potCards: [state.potCards, value], potColor: playCard.color }),
            () => { this.socket.emit('updateState', { hand: this.state.hand, turn: this.state.turn, potCards: this.state.potCards, potColor: this.state.potColor }) });
        }
        else if (playCard.type === '+2') {
          this.setState((state) => ({ hand: hand, turn: Math.abs(state.turn + state.direction) % player, potCards: [state.potCards, value], draw: state.draw + 2, potColor: playCard.color }),
            () => { this.socket.emit('updateState', { hand: this.state.hand, turn: this.state.turn, potCards: this.state.potCards, draw: this.state.draw, potColor: this.state.potColor }) });
        }
        else if (playCard.type === 'wild') {
          this.setState((state) => ({ hand: hand, potCards: [state.potCards, value] }),
            () => { this.socket.emit('updateState', { hand: this.state.hand, potCards: this.state.potCards }) });
          window.$('#colorModal').modal('show');
        }
        else if (playCard.type === 'wild+4') {
          this.setState((state) => ({ hand: hand, potCards: [state.potCards, value], draw: state.draw + 4 }),
            () => { this.socket.emit('updateState', { hand: this.state.hand, potCards: this.state.potCards, draw: this.state.draw }) });
          window.$('#colorModal').modal('show');
        }
      }
    }

    else {
      alert("color or number doesn't match!! \n play another card or draw a card!!");
    }
  }

  // to handle a player drawing a card or multiple cards
  draw(e, d) {
    if (e) {
      if (parseInt(e.target.dataset.player) !== this.state.turn) {
        alert(`Slow down! It's not your turn!!`);
        return;
      }
    }

    console.log(d);
    let deck = this.state.deck;
    let turn = this.state.turn;
    let draw;
    if (d) draw = d;
    else if (this.state.draw) draw = this.state.draw;
    else draw = 1;
    //draw = (this.state.draw) ? this.state.draw : 1;
    let player = this.state.players.length;

    if (deck.length >= draw) {
      let j = 0;
      let drawInterval = setInterval(() => {
        j++;
        let hand = this.state.hand;
        let playerHand = hand[turn];
        playerHand.push(deck.splice(-1)[0]);
        hand[turn] = playerHand;
        this.setState({ hand: hand }, () => {
          this.socket.emit('updateState', { hand: this.state.hand })
        });

        if (j >= draw) {

          this.setState((state) => ({ deck: deck, turn: (d) ? state.turn : Math.abs(state.turn + state.direction) % player, draw: (d) ? state.draw : 0 }),
            () => {
              this.socket.emit('updateState', { deck: this.state.deck, turn: this.state.turn, draw: this.state.draw, hand: this.state.hand })
            });

          clearInterval(drawInterval);
        }



      }, 500);


    }

    else {
      let pot = this.state.potCards;
      var newDeck = deck.unshift(Shuffle(pot.splice(0, pot.length - 1)));

      let j = 0;
      let drawInterval = setInterval(() => {
        j++;

        let hand = this.state.hand;
        let playerHand = this.state.hand[turn];
        playerHand.push(newDeck.splice(-1)[0]);
        hand[turn] = playerHand;
        this.setState({ hand: hand }, () => {
          this.socket.emit('updateState', { hand: this.state.hand })
        });

        if (j >= draw) {
          this.setState((state) => ({ deck: newDeck, turn: (d) ? state.turn : Math.abs(state.turn + state.direction) % player, potCards: pot, draw: (d) ? state.draw : 0 }),
            () => {
              this.socket.emit('updateState', { deck: this.state.deck, turn: this.state.turn, potCards: this.state.potCards, draw: this.state.draw, hand: this.state.hand })
            });

          clearInterval(drawInterval);
        }

      }, 500);
    }
  }

  // to handle the rule checking if the player played the right type of card
  checkColor(card) {
    let pot = this.state.potCards;
    let potSize = pot.length;
    let potColor = this.state.potColor;
    if (potSize !== 0) {
      if (card.type === 'regular' && pot.slice(-1)[0].slice(1) !== card.value && potColor !== card.color) return false;
      else if (card.type === '+2' && pot.slice(-1)[0].slice(1) !== '+2' && potColor !== card.color) return false;
      else if (card.type === 'rev' && pot.slice(-1)[0].slice(1) !== 'rev' && potColor !== card.color) return false;
      else if (card.type === 'skip' && pot.slice(-1)[0].slice(1) !== 'skip' && potColor !== card.color) return false;
    }
    return true;
  }

  // to update color of discard pile when player changes it using a wild card
  updateColor(e) {
    let color = e.target.dataset.value;
    let player = this.state.players.length;
    this.setState((state) => ({ potColor: color, turn: Math.abs(state.turn + state.direction) % player }),
      () => { this.socket.emit('updateState', { potColor: this.state.potColor, turn: this.state.turn }) });
  }

  // to get the property of card played
  cardInfo = (card) => {
    const length = card.length;
    var color, type, value;
    if (card[0] === 'r' || card[0] === 'g' || card[0] === 'b' || card[0] === 'y') {
      color = card[0];
      if (length === 2) { type = 'regular'; value = card[1] }
      else if (length === 3) type = '+2';
      else if (length === 4) type = 'rev';
      else type = 'skip';
    }
    else {
      color = 'pending';
      type = card;
    }
    return { color: color, type: type, value: value };
  };


  componentDidMount() {

  }

  render() {

    const pot = () => {
      if (this.state.potCards.length) {
        return (
          <img alt='pot card' width={61.5} height={87.8} src={'./images/cards/' + this.state.potCards.slice(-1)[0] + '.png'} style={{}} />
        )
      }
      else {
        return (
          <img alt='pot card' width={61.5} height={87.8} src="./images/cards/blank.png" />
        );
      }
    }
    const hand = (player) => this.state.hand[player].map((card, i) => {
      return (
        <button key={i} className='btn btn-info' onClick={this.playCard}>
          <img alt='card' width={41.0} height={58.5} data-player={player} data-value={card} data-index={i} src={'./images/cards/' + card + '.png'} />
        </button>
      );
    });

    const playCardImg = () => {
      return <img alt='play card' id='cardImg' width={61.5} height={87.8} src={'./images/cards/' + this.state.playCard[0] + '.png'} onChange={() => { }} />;
    };

    const drawButton = (player) => {
      return <button className='btn btn-info btn-sm' data-player={player} onClick={(e) => { this.draw(e, 0) }}>DRAW {this.state.draw > 0 ? <span className='badge badge-light'>{this.state.draw}</span> : null}</button>
    };

    const connectedPlayers = this.state.players.map((name, i) => {
      return (
        <div key={i} >{i + 1}) {name} {(i === 0) ? (<span style={{ color: 'red' }}> &lt;--DEALER</span>) : null}</div>
      );
    });

    return (
      <div className="App">
        {(!this.state.gameServer && !this.state.connecting) ? (
          <div className='col-12' id='homePage'>
            <div className='col-12 header'>Welcome to UNO Game!</div>
            <div className='col-12'>
              {/* <button onClick={() => { console.log(this.state) }}>State</button> */}
              <form onSubmit={this.handleSubmit}>
                <label>
                  <b>Your name:</b><br />
                  <input type="text" value={this.state.name} onChange={(e) => this.setState({ name: e.target.value })} placeholder='name' />
                </label><br />
                <input type="submit" value="Join Game" className='button' />
              </form>
            </div>
          </div>
        ) : ((this.state.connecting) ? <div className='connecting'>
          Connecting to server... Pelase Wait
        </div> : ((this.state.gameServer && !this.state.gameOn) ? (
            <div className='col-12' id='waitingPage'>
              <div className='col-12'>{`${this.state.name}, you have now joined the server! \n See below for list of players in the waiting area. If you are the dealer, once you see all the players you want to play with press start. Otherwise wait till the dealer starts the game.`}</div>
              <div className='col-6'>
                {/* <button onClick={() => { console.log(this.state) }}>State</button> <br /> */}
                <b>List of connected players</b>
                {connectedPlayers}
              </div>
              {(this.state.order === 0) ? <div className='col-6'>
                <button onClick={this.start}>Start Game</button>
              </div> : null}
            </div>
          )
            : ((this.state.winner === null) ? (
              <div>
                <div className='row fix-it'>
                  <div className='col-12' id='deal'>
                    {/* <button onClick={() => { console.log(this.state) }}>State</button> */}
                    {(this.state.order === 0 && this.state.deal) ? (<button className='btn btn-success btn-sm' onClick={this.deal}>DEAL</button>) : null}
                  </div>
                  <div className='col-2' id='pot'>
                    <figure>
                      {pot()}
                      <figcaption style={{ 'fontSize': '6pt', 'fontWeight': 'bold', width: 61.5, 'textAlign': 'center' }}>DISCARD POT</figcaption>
                    </figure>
                    <button className='btn btn-sm' style={{ backgroundColor: (this.state.UNO) ? 'red' : 'grey' }} onClick={() => this.setState((state) => ({ UNO: !state.UNO }))}>UNO</button>
                  </div>
                  <div className='col-2' id='deck'>
                    <img alt='deck card' width={61.5} height={87.8} src="./images/cards/back.png" /><br />
                    {drawButton(this.state.order)}
                  </div>
                  <div className='col-8' id='message-board'>
                    <div className="card" style={{ width: '100%' }}>
                      <div className="card-body">
                        <h5 className="card-title">Message Board</h5>
                        <p className="card-text">
                          <b>TURN: {this.state.players[this.state.turn]}</b><br />
                          <b>POT COLOR: {(this.state.potColor === 'r') ? <span style={{ color: 'red' }}>RED</span> : ((this.state.potColor === 'b') ? <span style={{ color: 'blue' }}>BLUE</span> : ((this.state.potColor === 'g') ? <span style={{ color: 'green' }}>GREEN</span> : ((this.state.potColor === 'y') ? <span style={{ color: 'darkorange' }}>YELLOW</span> : null)))}</b> <br />
                          <b>HAND:  {this.state.players.map((name, i) => <span key={i}>{name}; {this.state.hand[i].length}, </span>)}</b>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className='row below'>
                  <div className='col-12' id='hand'>
                    {hand(this.state.order)}
                  </div>

                  <div className='modal' id='colorModal' data-keyboard="false" data-backdrop="static">
                    <div className='modal-content'>
                      <div className='modal-header'>
                        <h5 className="modal-title">MESSAGE</h5>
                      </div>
                      <div className='modal-body'>
                        <p> What color do you want to change to or stay the same color with? </p>
                      </div>
                      <div className="modal-footer">
                        <button type="button" className="btn btn-danger" data-dismiss="modal" data-value={'r'} onClick={this.updateColor}>RED</button>
                        <button type="button" className="btn btn-success" data-dismiss="modal" data-value={'g'} onClick={this.updateColor}>GREEN</button>
                        <button type="button" className="btn btn-warning" data-dismiss="modal" data-value={'y'} onClick={this.updateColor}>YELLOW</button>
                        <button type="button" className="btn btn-primary" data-dismiss="modal" data-value={'b'} onClick={this.updateColor}>BLUE</button>
                      </div>
                    </div>
                  </div>
                  <div className='modal' id='playModal'>
                    <div className='modal-content'>
                      <div className='modal-header'>
                        <h5 className="modal-title">WANT TO PLAY THE CARD BELOW?</h5>
                        <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                          <span aria-hidden="true">&times;</span>
                        </button>
                      </div>
                      <div className='modal-body'>
                        {playCardImg()}
                      </div>
                      <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" data-dismiss="modal" >CANCEL</button>
                        <button type="button" className="btn btn-success" data-dismiss="modal" id='play' value='a,b' onClick={this.play}>YES</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : <div style={{ fontSize: '20pt' }}>
                {this.state.winner} WON THE GAME!!!! <br />
                <button className='btn btn-sm btn-success' onClick={this.reset}>RESTART GAME</button>
              </div>)))}

      </div>
    );
  }
}

export default App;