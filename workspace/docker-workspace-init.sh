# zsh
chsh -s /bin/zsh
wget https://github.com/robbyrussell/oh-my-zsh/raw/master/tools/install.sh -O - | zsh || true

# vim
mkdir /root/.vim-backups

curl -fLo /root/.vim/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim

# nodejs
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
nvm install node

mkdir -p ~/.vim/ale_linters
mkdir -p ~/.vim/ftplugin
mkdir -p ~/.vim/syntax
ln -s /root/docker-vault/src/vim/ale_linters/vault ~/.vim/ale_linters/vault
ln -s /root/docker-vault/src/vim/ftplugin/vault.vim ~/.vim/ftplugin/vault.vim
ln -s /root/docker-vault/src/vim/syntax/vault.vim ~/.vim/syntax/vault.vim
