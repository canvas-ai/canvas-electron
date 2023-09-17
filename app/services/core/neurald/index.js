

const Db = require('../db')
const openai = require('openai-api')


// Power law
// Scale invariance
// 1000 brains
// The universe is a huge resonance chamber

class NeuralD {

    constructor(context, ) {

        this.context = context
        this.db = new Db({

        })


        // Timestamp | bitmap
        // Bitmap index represents bitmap IDs <0, 2^32 -1) currently in memory(context, features etc),
        // each change writes out the currently-active list to "STM" store as a separate bitmap
        // During inactivity, system goes through the activity log and all bitmaps stored in STM,
        // loads relevant documents and feeds them to the NN for training / finetuning


    }





}
