"use strict";

/**
 * ws Network Discovery
 */

// Utils
const log = console.log;

// Network discovery
// ? https://www.npmjs.com/package/bonjour
// ? > https://stackoverflow.com/questions/42102086/how-to-share-data-over-local-network-with-electron-express-application
/* Polo network requirements:
Data: TCP 63567
MULTICAST_ADDRESS = '224.0.0.234';
MULTICAST_PORT = 60547;  */
const Polo = require("polo");

// PeerD
// -> Roles
// --> roleA
//         -> Promote
//         -> Demote
//         -> Monitor node, if (**) flag as untrustworthy(hight prio broadcast msg) | flag to promote | flag to demote
//          Collect stats from other peers (demotion/promotion/flags/availability/response times/load)
//          Location dependent, unreachable peers in one network may be reachable in other
/* Fluid tracker list, initial tracker db from trusted peers, peer join NW on an invitation-only basis, peer ID associated
with invitee => peer flagged as untrustworthy will automatically flag invitee as well
"trackers" are promoted / demoted by other peers, tracker can have many roles, peer "value" is evaluated as an average*
 of all of its roles, many roles means more opportunity to be demoted => more roles == more responsibility == more stringent
 requirements for peer quality
*/

class Discovery extends Polo {
  // Lan discovery

  constructor(config) {
    log("Network discovery module");
    super(config);
  }
}

class PeerD extends CanvasService {}

module.exports = Polo;
