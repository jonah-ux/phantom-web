# Astra Relay author guide (spoilers)

This file is intentionally spoiler-separated from the public run path. It documents the authored solution so contributors can review the engine without pretending the repository is an anti-cheat system.

## Canon

Astra Relay opened in 1989. On 1997-08-21 the receiver recorded a blue-channel pulse at 03:17 while its clock carried a seven-minute drift. The public index called the event weather interference. The crew instead used the blue handshake to move through a quiet harbor on 1997-08-22, signed a departure packet, and asked the archive to keep the route private. A later clipping was postmarked with the old date and corrected at 03:17. The present archive heartbeat is an invitation to a new witness.

The weather explanation is an intentional red herring. The roster gap is an observation that helps Ilya explain why the night rotation stayed unlisted; it is not an ending by itself.

## Clue route

1. Open `maintenance` for `clock-0317`.
2. Open `news-disappearance` for `postmark-0317`.
3. Open `message-console` and run `COMPARE CLOCKS` for `repeat-is-local`.
4. Ask Mara about the triangle for `archivist-redaction-key`.
5. Open `correspondence` for `crew-survived`.
6. Ask Ilya about the blue channel for `maintenance-signature`, then ask why the relay stayed dark for `quarantine-reason`.
7. Choose one witness branch:
   - ask Noor for `reporter-confirmation`, then audit and publish (`expose`); or
   - ask Mara for `archivist-request`, then audit and seal (`protect`).

The order of the first five discoveries can vary. Every clue reward is idempotent and is recorded in the session event ledger.

## Character boundaries

Mara protects names and can disclose the triangle key and privacy request. Ilya is the receiver engineer and can disclose the maintenance signature and quarantine reason. Noor is the reporter and second witness; she confirms the survival route only after the packet and reason are present. A model proposal that claims a forbidden clue, invents a clue ID, repeats a reward, or sets an ending is rejected without mutating state.

## Endings

- **Wake the relay / publish:** requires `decision-ready` and `reporter-confirmation`. The relay publishes the evacuation evidence while keeping the harbor unnamed.
- **Keep the harbor quiet / protect:** requires `decision-ready` and `archivist-request`. The packet remains sealed and the archive records the witness's restraint.
