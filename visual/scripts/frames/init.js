
"use strict";
/*jslint browser: true, nomen: true*/
/*global define*/

define(["./playground", "./title", "./intro", "./overview", "./election", "./replication", "./conclusion"],
    function (playground, title, intro, overview, election, replication, conclusion) {
        return function (player) {
            // player.frame("playground", "Playground", playground);
            player.frame("home", "Início", title);
            player.frame("intro", "O que é Consenso Distribuído?", intro);
            player.frame("overview", "Visão geral do Protocolo", overview);
            player.frame("election", "Eleição do Líder", election);
            player.frame("replication", "Replicação de Log", replication);
            player.frame("conclusion", "Outros Recursos", conclusion);
        };
    });
