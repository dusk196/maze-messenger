import { Component, Inject, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseReference, onValue, child, Unsubscribe } from "@angular/fire/database";

import { Subscription } from 'rxjs';
import { cloneDeep } from 'lodash';

import { RoutePaths, ErrorModal, GenericConst, MessageConst, NoUserModal } from 'src/app/types/enums';
import { ILocalUser, IModal } from 'src/app/types/sauf.types';
import { UtilsService } from 'src/app/services/utils.service';
import { DbService } from 'src/app/services/db.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss']
})

export class MessagesComponent implements OnDestroy {

  readonly roomId = this._activatedroute.snapshot.params['roomId'];
  private allUsersHook: Unsubscribe;
  localUser: ILocalUser = { id: '', name: '', associatedRoomId: '' }
  allConnectedUsers: ILocalUser[] = [];
  aliasFormData: string = '';
  localUserSubs: Subscription;
  message: string = '';
  copyText: string = GenericConst.Copy;
  placeholderText: string = MessageConst.Placeholder;
  modalDetails: IModal = {
    title: '',
    message: '',
    show: false
  };

  constructor(
    @Inject(ActivatedRoute)
    private _activatedroute: ActivatedRoute,
    private _router: Router,
    private _utilsService: UtilsService,
    private _dbService: DbService
  ) {
    this.localUserSubs = this._utilsService.getAlias().subscribe((alias: ILocalUser) => {
      if (this._utilsService.isNullOrEmpty(alias.associatedRoomId)) {
        this._router.navigate([`/${RoutePaths.Home}`]);
      } else {
        this.localUser = { ...alias };
        this.aliasFormData = cloneDeep(alias.name);
      }
    });
    const dbRef: DatabaseReference = this._dbService.getDbRef();
    const params: string = `${environment.dbKey}/${this.roomId}/currentUsers`;
    this.allUsersHook = onValue(child(dbRef, params), (snapshot) => {
      const data = snapshot.val();
      if (!this._utilsService.isNullOrEmpty(data)) {
        this.allConnectedUsers = cloneDeep(data);
      } else {
        this.modalDetails = {
          title: NoUserModal.Title,
          message: NoUserModal.Message,
          show: true
        };
      }
    }, (error: Error) => {
      this.modalDetails = {
        title: ErrorModal.Title,
        message: ErrorModal.Message,
        show: true
      };
      console.log('error', error);
    });
  }

  onCopy(): void {
    navigator.clipboard.writeText(this.roomId);
    this.copyText = GenericConst.Copied;
  }

  generateAlias(): void {
    this.localUser.name = this._utilsService.generateRandomAlias();
    this._utilsService.updateAlias(this.localUser);
  }

  updateAlias(): void {
    this.localUser.name = cloneDeep(this.aliasFormData);
    this._utilsService.updateAlias(this.localUser);
    this.allConnectedUsers.filter((x: ILocalUser) => x.id === this.localUser.id)[0].name = this.aliasFormData;
    this._dbService.updateUsers(this.roomId, this.allConnectedUsers);
  }

  sendMessage(): void {
    console.log(this.message);
  }

  onMouseEnter(): void {
    this.copyText = GenericConst.Copied;
  }

  closeModal(): void {
    this.modalDetails.show = false;
    this._router.navigate([`/${RoutePaths.Home}`]);
  }

  ngOnDestroy(): void {
    this._utilsService.resetAlias();
    this.localUserSubs.unsubscribe();
    this.allUsersHook();
  }

}
