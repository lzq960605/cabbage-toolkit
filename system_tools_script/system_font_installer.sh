#!/bin/bash
echo "ready to install chinese fonts."
sudo steamos-readonly disable
sudo pacman-key --init
sudo pacman-key --populate archlinux
sudo pacman	-S --noconfirm	glibc
sudo sed -i 's/# zh/zh/g'  /etc/locale.gen
sudo sed -i 's/#zh/zh/g'  /etc/locale.gen
sudo locale-gen

echo "Ready to exit in 3 second."
sleep 3
