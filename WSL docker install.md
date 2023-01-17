# Installation de WSL (windows subsystem for linux)/Docker/Kubernetes en local, derriere proxy Korian.

:warning: à faire en VPN hors dsi (TT ou 5g)

Powershell : 

`wsl --install`  :warning: **requière un admin pour cette étape**

`Wsl --install Ubuntu ` (au autre distro)

` Wsl –l –v` 

Cheker que la distro est bien en wsl2

Si ce n’est pas le cas

`wsl --set-version <distro name> 2`

Faire ajouter son user dans le groupe windows Docker-user  :warning: **requière un admin pour cette étape**

Eteindre wsl et configurer la ram allouée maximum

`Wsl --shutdown`

Créer dans votre home directory (%USERPROFILE% dans l'explorer) un fichier .wslconfig

    [wsl2]
    memory=2GB

Installer [docker desktop]([https://](https://docs.docker.com/desktop/windows/install/)), en cochant bien la compatibilite wsl2 :warning: **requière un admin pour cette étape**

Configurer comme cela :
![General setting](/readme_images/docker_general.png)

Conf proxy

![proxy](/readme_images/docker_proxy.png)

Wls integration

![wsl](/readme_images/docker_wsl2.png)

Installer et activer kubernetes

![k8s](/readme_images/docker_k8s.png)

Checker que c’est ok cote windows en cmd 

 `kubectl version`

Client version et server version doivent etre similaire, si ce n'est pas le cas verrifier que  le proxy est bien configuré

Dans wsl checker que votre distro est bien par defaut 

 `Wsl –l`

Si ce n’est pas le cas 

 `wsl --setdefault DISTRO-NAME`

Updater la distro wsl

`sudo apt update`

`sudo apt upgrade`

Configuer le bashrc du wsl pour passer par le proxy : 

`nano ~/.bashrc`

    # conf proxy
    http_proxy=http://guillaume.coue-ext:pwd@proxy-cloud.korian.cloud:80
    https_proxy=$http_proxy
    export http_proxy
    export https_proxy
    export no_proxy=.internal

`source ~/.bashrc`

Installer Helm : [HELM install]([https://](https://helm.sh/fr/docs/intro/install/))


