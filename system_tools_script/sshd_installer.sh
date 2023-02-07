#!/bin/bash
echo "ready to install sshd."
sudo steamos-readonly disable
sudo pacman-key --init
sudo pacman-key --populate archlinux
sudo pacman -S --noconfirm openssh
systemctl start sshd
sudo systemctl enable sshd.service

echo "Ready to exit in 3 second."
sleep 3
