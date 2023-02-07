#!/bin/bash

sudo steamos-readonly disable
sudo pacman-key --init
sudo pacman-key --populate archlinux
sudo pacman -S openssh
systemctl start sshd
sudo systemctl enable sshd.service

echo "Ready to exit in 3 second."
sleep 3
