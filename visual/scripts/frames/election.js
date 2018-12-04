
"use strict";
/*jslint browser: true, nomen: true*/
/*global define*/

define([], function () {
    return function (frame) {
        var player = frame.player(),
            layout = frame.layout(),
            model = function() { return frame.model(); },
            client = function(id) { return frame.model().clients.find(id); },
            node = function(id) { return frame.model().nodes.find(id); },
            cluster = function(value) { model().nodes.toArray().forEach(function(node) { node.cluster(value); }); },
            wait = function() { var self = this; model().controls.show(function() { self.stop(); }); },
            subtitle = function(s, pause) { model().subtitle = s + model().controls.html(); layout.invalidate(); if (pause === undefined) { model().controls.show() }; };

        //------------------------------
        // Title
        //------------------------------
        frame.after(1, function() {
            model().clear();
            layout.invalidate();
        })
        .after(500, function () {
            frame.model().title = '<h2 style="visibility:visible">Eleição do Líder</h1>'
                                + '<br/>' + frame.model().controls.html();
            layout.invalidate();
        })
        .after(200, wait).indefinite()
        .after(500, function () {
            model().title = "";
            layout.invalidate();
        })

        //------------------------------
        // Initialization
        //------------------------------
        .after(300, function () {
            model().nodes.create("A").init();
            model().nodes.create("B").init();
            model().nodes.create("C").init();
            cluster(["A", "B", "C"]);
        })

        //------------------------------
        // Election Timeout
        //------------------------------
        .after(1, function () {
            model().ensureSingleCandidate();
            model().subtitle = '<h2>No Raft, há dois parâmetros de timeout que controlam as eleições.</h2>'
                           + model().controls.html();
            layout.invalidate();
        })
        .after(model().electionTimeout / 2, function() { model().controls.show(); })
        .after(100, function () {
            subtitle('<h2>O primeiro é o <span style="color:green">timeout de eleição</span>.</h2>');
        })
        .after(1, function() {
            subtitle('<h2>O timeout de eleição é o tempo que um seguidor aguarda até tornar-se um cadidato.</h2>');
        })
        .after(1, function() {
            subtitle('<h2>O timeout de eleição é randomicamente definido entre 150ms e 300ms.</h2>');
        })
        .after(1, function() {
            subtitle("", false);
        })

        //------------------------------
        // Candidacy
        //------------------------------
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "candidate");
        })
        .after(1, function () {
            subtitle('<h2>Atingido o timeout de eleição, o seguidor torna-se um candidato e inicia um novo período de eleição <em>(election term)</em>...</h2>');
        })
        .after(1, function () {
            subtitle('<h2>...vota nele mesmo...</h2>');
        })
        .after(model().defaultNetworkLatency * 0.25, function () {
            subtitle('<h2>...and sends out <em>Request Vote</em> messages to other nodes.</h2>');
        })
        .after(model().defaultNetworkLatency, function () {
            subtitle('<h2>If the receiving node hasn\'t voted yet in this term then it votes for the candidate...</h2>');
        })
        .after(1, function () {
            subtitle('<h2>...and the node resets its election timeout.</h2>');
        })


        //------------------------------
        // Leadership & heartbeat timeout.
        //------------------------------
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "leader");
        })
        .after(1, function () {
            subtitle('<h2>Once a candidate has a majority of votes it becomes leader.</h2>');
        })
        .after(model().defaultNetworkLatency * 0.25, function () {
            subtitle('<h2>The leader begins sending out <em>Append Entries</em> messages to its followers.</h2>');
        })
        .after(1, function () {
            subtitle('<h2>These messages are sent in intervals specified by the <span style="color:red">heartbeat timeout</span>.</h2>');
        })
        .after(model().defaultNetworkLatency, function () {
            subtitle('<h2>Followers then respond to each <em>Append Entries</em> message.</h2>');
        })
        .after(1, function () {
            subtitle('', false);
        })
        .after(model().heartbeatTimeout * 2, function () {
            subtitle('<h2>This election term will continue until a follower stops receiving heartbeats and becomes a candidate.</h2>', false);
        })
        .after(100, wait).indefinite()
        .after(1, function () {
            subtitle('', false);
        })

        //------------------------------
        // Leader re-election
        //------------------------------
        .after(model().heartbeatTimeout * 2, function () {
            subtitle('<h2>Let\'s stop the leader and watch a re-election happen.</h2>', false);
        })
        .after(100, wait).indefinite()
        .after(1, function () {
            subtitle('', false);
            model().leader().state("stopped")
        })
        .after(model().defaultNetworkLatency, function () {
            model().ensureSingleCandidate()
        })
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "leader");
        })
        .after(1, function () {
            subtitle('<h2>Node ' + model().leader().id + ' is now leader of term ' + model().leader().currentTerm() + '.</h2>', false);
        })
        .after(1, wait).indefinite()

        //------------------------------
        // Split Vote
        //------------------------------
        .after(1, function () {
            subtitle('<h2>Requiring a majority of votes guarantees that only one leader can be elected per term.</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            subtitle('<h2>If two nodes become candidates at the same time then a split vote can occur.</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            subtitle('<h2>Let\'s take a look at a split vote example...</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            subtitle('', false);
            model().nodes.create("D").init().currentTerm(node("A").currentTerm());
            cluster(["A", "B", "C", "D"]);

            // Make sure two nodes become candidates at the same time.
            model().resetToNextTerm();
            var nodes = model().ensureSplitVote();

            // Increase latency to some nodes to ensure obvious split.
            model().latency(nodes[0].id, nodes[2].id, model().defaultNetworkLatency * 1.25);
            model().latency(nodes[1].id, nodes[3].id, model().defaultNetworkLatency * 1.25);
        })
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "candidate");
        })
        .after(model().defaultNetworkLatency * 0.25, function () {
            subtitle('<h2>Two nodes both start an election for the same term...</h2>');
        })
        .after(model().defaultNetworkLatency * 0.75, function () {
            subtitle('<h2>...and each reaches a single follower node before the other.</h2>');
        })
        .after(model().defaultNetworkLatency, function () {
            subtitle('<h2>Now each candidate has 2 votes and can receive no more for this term.</h2>');
        })
        .after(1, function () {
            subtitle('<h2>The nodes will wait for a new election and try again.</h2>', false);
        })
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "leader");
        })
        .after(1, function () {
            model().resetLatencies();
            subtitle('<h2>Node ' + model().leader().id + ' received a majority of votes in term ' + model().leader().currentTerm() + ' so it becomes leader.</h2>', false);
        })
        .after(1, wait).indefinite()

        .then(function() {
            player.next();
        })


        player.play();
    };
});
