# 🚨 EMERGENCY INCIDENT REPORT: WALLET HIJACKING

Generated at: 2026-05-03T18:28:35.144Z
Status: ACCOUNT SEMI-LOCKED (Multi-sig Hijack)
Target: 0xBB5F9cDF24BdFAc0A1eBB63faa35900d9b5313c9

## 🛡️ PHASE 1: SERVER ACCESS LOGS
Suspect IPs identified accessing root:
```
May  2 15:38:34 server021294638 sshd[21555]: Accepted password for root from 77.35.193.51 port 64370 ssh2
May  2 15:40:16 server021294638 sshd[21826]: Accepted publickey for root from 77.35.193.51 port 54352 ssh2: ED25519 SHA256:po9SzNdFeZY77d5wLNkx80bjjyF+bn2wveAS2j60zek
May  3 17:11:35 server021294638 sshd[53130]: userauth_pubkey: key type ssh-dss not in PubkeyAcceptedKeyTypes [preauth]
May  3 17:19:23 server021294638 sshd[53507]: userauth_pubkey: key type ssh-dss not in PubkeyAcceptedKeyTypes [preauth]
May  3 17:53:49 server021294638 sshd[55360]: userauth_pubkey: key type ssh-dss not in PubkeyAcceptedKeyTypes [preauth]
May  3 18:21:17 server021294638 sshd[56640]: userauth_pubkey: key type ssh-dss not in PubkeyAcceptedKeyTypes [preauth]
May  3 18:29:40 server021294638 sshd[57014]: Accepted password for root from 185.115.37.43 port 64558 ssh2
May  3 18:43:05 server021294638 sshd[57813]: userauth_pubkey: key type ssh-dss not in PubkeyAcceptedKeyTypes [preauth]
May  3 19:30:44 server021294638 sshd[61427]: Accepted password for root from 185.115.37.43 port 62738 ssh2
```

## 🛡️ PHASE 2: SYSTEM MODIFICATIONS
Backdoor key modification time matching attack window:
```
File: /root/.ssh/authorized_keys
  Size: 1         	Blocks: 8          IO Block: 4096   regular file
Device: fc01h/64513d	Inode: 264234      Links: 1
Access: (0600/-rw-------)  Uid: (    0/    root)   Gid: (    0/    root)
Access: 2026-05-03 19:19:06.285858443 +0200
Modify: 2026-05-03 19:19:06.177848618 +0200
Change: 2026-05-03 19:19:06.177848618 +0200
 Birth: -
```

## 🛡️ PHASE 3: BLOCKCHAIN EVIDENCE (HYPERLIQUID)
- **HIJACK TX HASH:** 0x8530f2ace48d40c186aa043a76b26b0109000a927f805f9328f99dffa3811aac
- **ILLEGAL SIGNER ADDED:** 0x5f9ed4abf10b6bb5cd7b2de920392883f87fe79e
- **REMAINING FUNDS:** $40.09 USDC (STILL AT RISK!)

## 🛡️ PHASE 4: CROSS-CHAIN ATTACK (ARBITRUM)
- **DELEGATION TX HASH:** 0x32728281e4172da2609a907bdc5af5959c0849a0f0568beaa8cc4429068c1700
- **TECHNIQUE:** EIP-7702 Unauthorized Delegation

## 📜 EXECUTIVE SUMMARY FOR SUPPORT
The user's VPS was compromised by IP 77.35.193.51 (Russia) on May 2nd. Within 15 minutes of access, the attacker used the stolen private key to fund a secondary wallet and enable Multi-sig (1 of 1) on the Hyperliquid L1, effectively locking the legitimate owner out. Concurrently, an EIP-7702 delegation was established on Arbitrum. This is a coordinated professional attack. REQUESTING IMMEDIATE SIGNER RESET.
