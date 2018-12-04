
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
            subtitle('<h2>O timeout de eleição é o tempo que um seguidor aguarda até tornar-se um candidato.</h2>');
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
            subtitle('<h2>...e envia uma mensagem de <em>Requisição de voto</em> para os outros nós.</h2>');
        })
        .after(model().defaultNetworkLatency, function () {
            subtitle('<h2>Se o nó que recebe não votou ainda neste período (term), então ele vota no candidato...</h2>');
        })
        .after(1, function () {
            subtitle('<h2>...e o nó reinicia seu timeout de eleição.</h2>');
        })


        //------------------------------
        // Leadership & heartbeat timeout.
        //------------------------------
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "leader");
        })
        .after(1, function () {
            subtitle('<h2>Uma vez que um candidato tem a maioria dos votos, ele torna-se líder.</h2>');
        })
        .after(model().defaultNetworkLatency * 0.25, function () {
            subtitle('<h2>O líder começa a enviar mensagens de <em>Append Entries</em> para seus seguidores.</h2>');
        })
        .after(1, function () {
            subtitle('<h2>Estas mensagens são enviadas em intervalos especificados pelo <span style="color:red">timeout de heartbeat</span>.</h2>');
        })
        .after(model().defaultNetworkLatency, function () {
            subtitle('<h2>Os seguidores respondem a cada mensagem de <em>Append Entries</em>.</h2>');
        })
        .after(1, function () {
            subtitle('', false);
        })
        .after(model().heartbeatTimeout * 2, function () {
            subtitle('<h2>Este período de eleição (election term) continuará até que um seguidor pare de receber <em>heartbeats</em> e torne-se um candidato.</h2>', false);
        })
        .after(100, wait).indefinite()
        .after(1, function () {
            subtitle('', false);
        })

        //------------------------------
        // Leader re-election
        //------------------------------
        .after(model().heartbeatTimeout * 2, function () {
            subtitle('<h2>Vamos parar o líder e ver a reeleição acontecer.</h2>', false);
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
            subtitle('<h2>O nó ' + model().leader().id + ' agora é o líder do período (term) ' + model().leader().currentTerm() + '.</h2>', false);
        })
        .after(1, wait).indefinite()

        //------------------------------
        // Split Vote
        //------------------------------
        .after(1, function () {
            subtitle('<h2>Exigir a maioria dos votos garante que somente um líder pode ser eleito por período (term).</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            subtitle('<h2>Se dois nós tornam-se candidatos ao mesmo tempo, então uma votação dividida (split vote) pode ocorrer.</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            subtitle('<h2>Vamos ver um exemplo de votação dividida...</h2>', false);
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
            subtitle('<h2>Dois nós iniciam uma eleição para o mesmo período (term)...</h2>');
        })
        .after(model().defaultNetworkLatency * 0.75, function () {
            subtitle('<h2>...e cada um encontra um único nó seguidor antes do outro.</h2>');
        })
        .after(model().defaultNetworkLatency, function () {
            subtitle('<h2>Agora, cada candidato tem 2 votos e não pode receber mais nenhum voto neste período (term).</h2>');
        })
        .after(1, function () {
            subtitle('<h2>Os nós aguardarão por uma nova eleição e tentarão novamente.</h2>', false);
        })
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "leader");
        })
        .after(1, function () {
            model().resetLatencies();
            subtitle('<h2>O nó ' + model().leader().id + ' recebeu a maioria dos votos no período (term) ' + model().leader().currentTerm() + ', então ele torna-se o líder.</h2>', false);
        })
        .after(1, wait).indefinite()

        .then(function() {
            player.next();
        })


        player.play();
    };
});
