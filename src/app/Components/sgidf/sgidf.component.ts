import { Component, ElementRef, OnInit, Renderer2, ViewChild, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms'
import { Subscription } from 'rxjs';

import 'leader-line';

import { SgidfService } from 'src/app/Services/sgidf.service';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from 'src/app/Services/notification.service';
import { DataService } from 'src/app/Services/data.service';
import { Router } from '@angular/router';
import { promise } from 'protractor';

declare let LeaderLine: any;

interface idaasForm {
  name: string,
  value: string,
  disable:boolean,
  tooltip?:string
}

interface workflow {
  status:string,
  body:any,
  name:string
}

interface attach{
  index:number,
  attach:ElementRef<any>
  attached:ElementRef<any>,
  link:string,
  source:string
}

interface executor{
  createIdentityElement: Promise<any>,
  contactIdentifiersElement:Promise<any>,
  getIdentifiersElement:Promise<any>,
}

@Component({
  selector: 'app-sgidf',
  templateUrl: './sgidf.component.html',
  styleUrls: ['./sgidf.component.scss']
})
export class SgidfComponent implements OnInit, OnDestroy {

  createIdentityElementSbs = new Subscription
  private userIdentifier:string=""

  zoom=1
  error: boolean = false
  errorMsg: string = ""
  dragPosition = { x: 0, y: 0 };
  line = []
  attachedNumber: number = 1
  linkTrak=[]
  sgidfForms: idaasForm[] = [
    { 
      name: "create new Identity",
      value: "createIdentityElement",
      disable:false,
      tooltip:`contact identifier\nget Identitier ID`
    },
    { 
      name: "contact identifier",
      value: "contactIdentifiersElement",
      disable:false,
      tooltip:`get Identitier ID`
    },
    { 
      name: "get Identitier ID",
      value: "getIdentifiersElement",
      disable:false,
      tooltip:"none"
    },
    {
      name:"Login/password authenticate",
      value:"authenticate",
      disable:true 
    },
    {
      name:"OTP authenticate",
      value:"OTPAuthenticate",
      disable:true 
    },
    {
      name:"Login/password authenticate",
      value:"authenticate",
      disable:true 
    },
    {
      name:"OSL authenticate",
      value:"OSLAuthenticate",
      disable:true 
    },
    {
      name:"modify password",
      value:"modifyPWD",
      disable:true 
    },
    {
      name:"modify profile",
      value:"modifyProfile",
      disable:true 
    },
    {
      name:"show Session",
      value:"showSession",
      disable:true 
    },
    {
      name:"removeSession",
      value:"removeSession",
      disable:true 
    },
    {
      name:"remove all session",
      value:"removeAllSession",
      disable:true 
    }
  ]
  elements = []
  selectedValue: string = ""
  show: boolean = false
  attachForms = []
  allowedForms=[]
  transmittedInfos=[]
  transmittedInfo=""
  attachVal: string = ""
  attachedVal: string = ""
  attachTrack: attach[] = []

  detachState: boolean = false
  dettachedVal: string = ""
  dettachTracks = []
  identityBDay: any
  result:workflow[]=[]
  executionFlow=[]
  //Create identity variables:
  civilities = [{
    name:"M.",
    val: "male",
    id: "1"
  },
  {
    name:"Mme",
    val: "male",
    id: "2"
  }
  ]

  identifierTypes = [
    {
      name: "LOGIN",
    },
    {
      name: "ISF",
    }
  ]

  contactIdentifierTypes = [
    {
      name: "email",
    }
  ]

  action: string = ""

  showAttached:boolean=false

  executionStatus:boolean=true
  runStatus:boolean=false
  // executor:executor

  @ViewChild("parent") parentDiv: ElementRef
  @ViewChild("row") rowElem: ElementRef
  @ViewChild('createIdentityElement', { read: ElementRef }) createIdentityElement: ElementRef;
  @ViewChild('IdentifiersElem', { read: ElementRef }) IdentifiersElem: ElementRef;
  @ViewChild('contactIdentifiersElem', { read: ElementRef }) contactIdentifiersElem: ElementRef;
  @ViewChild('contactIdentifiersElement', { read: ElementRef }) contactIdentifiersElement: ElementRef;
  @ViewChild('getIdentifiersElement', { read: ElementRef }) getIdentifiersElement: ElementRef;

  constructor(
    private renderer: Renderer2,
    private SGIDFSvc: SgidfService,
    private formBuilder: FormBuilder,
    private notification :NotificationService,
    private dataSvc:DataService,
    private router:Router,
  ) { }


  // Create user -Full identity- forms
  createFullIdentity = this.formBuilder.group({
      status: ['activated'],
      profile: this.formBuilder.group({
        civility: ["1", [Validators.required, Validators.minLength(1), Validators.maxLength(2)]],
        displayName: ['bsachref', [Validators.required, Validators.minLength(3), Validators.maxLength(35)]],
        firstName: ['BOUSNINA', [Validators.required, Validators.minLength(3), Validators.maxLength(35)]],
        lastName: ['Achraf', [Validators.required, Validators.minLength(3), Validators.maxLength(35)]],
        avatar: ["1'avatar1", [Validators.required, Validators.minLength(3), Validators.maxLength(35)]],
        gender: ["1", [Validators.required, Validators.minLength(1), Validators.maxLength(2)]],
        birthdate: ['1988-08-01', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
        timeZone: ['Europe/Paris'],
        language: ['fr']
    }),
    password: this.formBuilder.group({
      value: ['Azerty123', [Validators.required, Validators.minLength(3)]]
    }),
    contactIdentifiers: this.formBuilder.array([]),
    identifiers : this.formBuilder.array([])
  })

  contactIdentifiers= this.formBuilder.group({
    type: ['', [Validators.required, Validators.minLength(3)]],
    valye: ['', [Validators.required, Validators.minLength(3)]],
    provider: ['', [Validators.required, Validators.minLength(3)]]

  })

  identifiers= this.formBuilder.group({
    value: ['', [Validators.required, Validators.minLength(3)]],
    isPassword: ['', [Validators.required, Validators.minLength(3)]],
    type: ['', [Validators.required, Validators.minLength(3)]]
  })

  get getConcatIdentifiers() {
    return this.createFullIdentity.controls["contactIdentifiers"] as FormArray;
  }

  get getIdentifiersForm() {
    return this.createFullIdentity.controls["identifiers"] as FormArray;
  }

  // Add, update or delete contact identifier
  contactIdentifiersForms = this.formBuilder.group({
    value: ['achraf.bousninsa@sofrecom.com', [Validators.required, Validators.email || Validators.minLength(8)]],
    isPassword: [false],
    type: ['email', [Validators.minLength(5), Validators.maxLength(6), Validators.required]],
  })

  // Create user -Full identity- forms
  modifiedContactIdentifier = this.formBuilder.group({
    value: [null, [Validators.required, Validators.email || Validators.minLength(8)]],
    isPassword: [false],
    type: ['email', [Validators.minLength(5), Validators.maxLength(6), Validators.required]],
  })

  IdentifiersForms = this.formBuilder.group({
    type:  ['LOGIN', [Validators.required, Validators.email || Validators.minLength(8)]],
    value:  ['achraf.bousninsa@sofrecom.com', [Validators.required, Validators.email || Validators.minLength(8)]],
    provider: ['sandbox', [Validators.required, Validators.email || Validators.minLength(8)]],
  })

  // get user id 
  getIdentifier = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
  })

  updateIdentityPwd = this.formBuilder.group({
    password: this.formBuilder.group({
      value: ['', [Validators.required, Validators.minLength(8)]]
    }),
  })

  ngOnInit() {
    this.result=[]
    this.linkTrak=[]
  }

  zoomOut(){
    this.zoom+=0.1
    this.renderer.setStyle(this.rowElem.nativeElement,"transform", `scale(${this.zoom})`)
    this.renderer.setStyle(this.rowElem.nativeElement,"margin-top", `5%`)
    this.renderer.setStyle(this.parentDiv.nativeElement,"margin-top", `5%`)
    this.updatePosition()
  }

  zoomIn(){
    this.zoom-=0.1
    this.renderer.setStyle(this.rowElem.nativeElement,"transform", `scale(${this.zoom})`)
    this.renderer.setStyle(this.rowElem.nativeElement,"margin-top", `5%`)
    this.updatePosition()
  }

  insertIdentityElement(){
    this.getIdentifiersForm.push(this.IdentifiersForms)
  }

  insertContactIdentityElement(){
    this.getConcatIdentifiers.push(this.contactIdentifiersForms);
  }

  createNewUser(form: FormGroup) {
    return new Promise((resolve,reject)=>{
      this.createIdentityElementSbs =this.SGIDFSvc.creatIdentity(form.value).subscribe(
        (createIdentityRes) => {
          console.log("[sgidfComponent] createNewUser success")
          console.log("[sgidfComponent] createNewUser res: "+JSON.stringify(createIdentityRes))
          this.result.push({
            name:"create Identity",
            body:createIdentityRes["body"],
            status:"pass"
          })
          console.log('after patch forms')
          return resolve(true)
        },
        (errorRes: HttpErrorResponse) => {
          console.log("[sgidfComponent] createNewUser failed")
          console.log(errorRes)
          this.result.push({
            name:"contact Identifiers",
            body:errorRes["error"],
            status:"failed"
          })
          return reject(false)
        }
      )
      // if(form.status=="VALID"){
      //   console.log("step1")
      // }else{
      //   this.error=true
      //   this.errorMsg="create identity form is not valid"
      // }
    })
  }

  contactIdentifiersFn(form: FormGroup) {
    return new Promise((resolve,reject)=>{
      if (this.action !== "") {
        resolve(true)
        this.SGIDFSvc.updateContactIdentifiers({
          methode: this.action,
          value: form.controls.value.value,
          type:form.controls.type.value
        })
        .subscribe(contactIdentifiersFnRes => {
          console.info("[sgidfComponent] contactIdentifiersFn success")
          this.result.push({
            name:"contact identifier",
            body:JSON.parse(contactIdentifiersFnRes["body"]),
            status:"pass"
          })
          return resolve(true)
          // this.notification.success("ContactIdentifier  modifié avec succés!!!!")
        },
        (contactIdentifiersFnErr: HttpErrorResponse) => {
          console.error("[sgidfComponent] contactIdentifiersFn failed")
          console.error(contactIdentifiersFnErr);
          this.result.push({
            name:"contact identifier",
            body:contactIdentifiersFnErr["error"],
            status:"failed"
          })
          return reject(false)
        })
      }
      // if(form.valid==true){
      // }else{
      //   this.error=true
      //   this.errorMsg="update contact identifier form is not valid"
      // }
    })
  }

  getIdentifierId(form: FormGroup) {
    console.log(form)
    return new Promise((resolve, reject)=>{
      if(form.valid==true){
        this.SGIDFSvc.getIdentifier(form.value).subscribe(identifierRes => {
          console.info("[sgidfComponent] getIdentifierId success")
          console.info(identifierRes)
          this.userIdentifier=identifierRes["id"]
          this.result.push({
            name:"get identifier",
            body:identifierRes,
            status:"pass"
          })
          return resolve(true)
          // this.notification.success("get user ID")
        },
          (getIdentifierErr: HttpErrorResponse) => {
            console.error("[sgidfComponent] getIdentifierId failed")
            console.error(getIdentifierErr)
            this.result.push({
              name:"get identifier",
              body:getIdentifierErr["error"],
              status:"failed"
            })
            return reject(false)
        })
      }else{
        this.error=true
        this.errorMsg="get identifier form is not valid"
      }
    })
  }

  updatepwdIdentityFn(form: FormGroup) {
    this.SGIDFSvc.updateidentitypwd(form.value).subscribe
  }

  setAction(type) {
    this.action = type
  }

  addNewElem() {
    console.log(this.createIdentityElement.nativeElement.style.display)
    switch (this.selectedValue) {
      case "createIdentityElement":
        if(this.createIdentityElement.nativeElement.style.display!=="block"){
          this.renderer.setStyle(this.IdentifiersElem.nativeElement,"display", "block")
          this.renderer.setStyle(this.IdentifiersElem.nativeElement,"position", "relative")
          this.renderer.setStyle(this.contactIdentifiersElem.nativeElement,"display", "block")
          this.renderer.setStyle(this.contactIdentifiersElem.nativeElement,"position", "relative")
          this.renderer.setStyle(this.createIdentityElement.nativeElement,"display", "block")
          this.renderer.setStyle(this.createIdentityElement.nativeElement,"position", "relative")
          this.elements.push(`${this.createIdentityElement}`)
          this.insertExecutionFlow(["createIdentityElement"])
          this.attachForms.push({
            name:"create identity",
            value:"createIdentityElement",
            disable:false
          })
          this.show=true
        }
        break;
      case "contactIdentifiersElement":
        if(this.contactIdentifiersElement.nativeElement.style.display!=="block")  
        {
          this.renderer.setStyle(this.contactIdentifiersElement.nativeElement,"display", "block")
          this.renderer.setStyle(this.contactIdentifiersElement.nativeElement,"position", "relative")
          this.elements.push(`${this.contactIdentifiersElement}`)
          this.insertExecutionFlow(["contactIdentifiersElement"])
          this.attachForms.push({
            name:"update identifier",
            value:"contactIdentifiersElement",
            disable:false

          })
          this.show=true
        }
        break;
      case "getIdentifiersElement":
        if(this.getIdentifiersElement.nativeElement.style.display!=="block")  
        {
          this.renderer.setStyle(this.getIdentifiersElement.nativeElement,"display", "block")
          this.renderer.setStyle(this.getIdentifiersElement.nativeElement,"position", "relative")
          this.elements.push(`${this.getIdentifiersElement}`)
          this.insertExecutionFlow(["getIdentifiersElement"])
          this.attachForms.push({
            name:"get identity ID",
            value:"getIdentifiersElement",
            disable:false
          })
          this.show=true
        }
        break;
    }
  }

  setAttachedVal(val) {
    this.attachedVal = val
  }

  updateDettachedVal(val) {
    this.dettachedVal = val
  }

  //this must be updated in order to consider the new included forms
  updateAttachedVal(val) {
    this.attachVal = val
    this.allowedForms=[]
    this.transmittedInfos=[]
    if(val=="none"){
      this.showAttached=false
      this.error=true
      this.errorMsg="Please choose form before click on attach button"
    }else{
      this.showAttached=true
      switch (val) {
        case "createIdentityElement":
          this.allowedForms.push(
            {
              name:"update identifier",
              value:"contactIdentifiersElement"
            },
            {
              name:"get identity ID",
              value:"getIdentifiersElement"
            }
          )
          this.transmittedInfos.push("email", "mobile")
        break;

        case "getIdentifiersElement":
          this.allowedForms.push(
            {
              name:"update identifier",
              value:"contactIdentifiersElement"
            })
            this.transmittedInfos.push("email", "id")
        break;
      }
    }
  }

  updateTransmittedInfo(val){
    this.transmittedInfo=val
  }

  nameChanged(event) {
    this.selectedValue=event
  }

  updatePosition() {
    for (const track of this.attachTrack) {
      this.line[track.index].remove()
      this.line[track.index] = new LeaderLine(track.attach.nativeElement, track.attached.nativeElement, { color: 'black', size: 4, endLabel: `${track.link}` });
    }
  }

  canAttach(table){
    return new Promise((resolve, reject)=>{
      table.forEach(val=>{
        switch (val) {
          case "createIdentityElement":
            if(this.createIdentityElement.nativeElement.style.display!=="block"){
              reject(false)
            }
            break;
          case "contactIdentifiersElement":
            if(this.contactIdentifiersElement.nativeElement.style.display!=="block"){
              return reject(false)
            }
          break;

          case "getIdentifiersElement":
            if(this.getIdentifiersElement.nativeElement.style.display!=="block"){
              return reject(false)
            }
          break;
        }
      })
      return resolve(true)
    })
  }

  //to be verified and updated to make sur the number of attached link per form
  attach() {
    if(this.attachVal==null || this.attachVal==undefined || this.attachedVal==null || this.attachedVal==undefined){
      this.error=true
      this.errorMsg="Please choose form before click on attach button"
    }else if(this.attachVal==this.attachedVal){
      this.error=true
      this.errorMsg="Forms must be different to be attached"
    }else if(this.showAttached==false){
      this.error=true
      this.errorMsg="Please add another form before attach"
    }else{
      this.error=false
      this.errorMsg=""
      switch (`${this.attachVal}${this.attachedVal}`) {
        case "createIdentityElementcontactIdentifiersElement":
          this.canAttach(["createIdentityElement","contactIdentifiersElement"]).then(()=>{
            this.line[this.attachedNumber]=new LeaderLine(this.createIdentityElement.nativeElement, this.contactIdentifiersElement.nativeElement, {color: 'black', size: 4, endLabel: `${this.attachedNumber}: ${this.transmittedInfo}`});
            this.attachTrack.push({
              index:this.attachedNumber,
              attach:this.createIdentityElement,
              attached:this.contactIdentifiersElement,
              link:`${this.attachedNumber}:${this.transmittedInfo}`,
              source:"createIdentityElement",
            })
            this.dettachTracks.push(`${this.attachedNumber}:${this.transmittedInfo}`)
            this.detachState=true
            this.attachedNumber+=1
          })
        break;
        case "createIdentityElementgetIdentifiersElement":
          this.canAttach(["createIdentityElement","getIdentifiersElement"]).then(()=>{
            this.line[this.attachedNumber]=new LeaderLine(this.createIdentityElement.nativeElement, this.getIdentifiersElement.nativeElement, {color: 'black', size: 4, endLabel: `${this.attachedNumber}: ${this.transmittedInfo}`});
            this.attachTrack.push({
              index:this.attachedNumber,
              attach:this.createIdentityElement,
              attached:this.getIdentifiersElement,
              link:`${this.attachedNumber}:${this.transmittedInfo}`,
              source:"createIdentityElement",
            })
            this.dettachTracks.push(`${this.attachedNumber}:${this.transmittedInfo}`)
            this.detachState=true
            this.attachedNumber+=1
          })
        break;
        case "getIdentifiersElementcontactIdentifiersElement":
          this.canAttach(["getIdentifiersElement","contactIdentifiersElement"]).then(()=>{
            this.line[this.attachedNumber]=new LeaderLine(this.getIdentifiersElement.nativeElement, this.contactIdentifiersElement.nativeElement, {color: 'black', size: 4, endLabel: `${this.attachedNumber}: ${this.transmittedInfo}`});
            this.attachTrack.push({
              index:this.attachedNumber,
              attach:this.getIdentifiersElement,
              attached:this.contactIdentifiersElement,
              link:`${this.attachedNumber}:${this.transmittedInfo}`,
              source:"getIdentifiersElement"
            })
            this.dettachTracks.push(`${this.attachedNumber}:${this.transmittedInfo}`)
            this.detachState=true
            this.attachedNumber+=1
          })
        break;
      }
      this.allowedForms=[]
      this.transmittedInfos=[]
    }
  }

  close(id){
    console.log('close forms')
    console.log(this.executionFlow)
    switch (id) {
      case "createIdentityElement":
        console.log('reset createIdentityElement')
        this.createFullIdentity.reset()
        this.renderer.setStyle(this.createIdentityElement.nativeElement,"display", "none")
        this.renderer.setStyle(this.IdentifiersElem.nativeElement,"display", "none")
        this.renderer.setStyle(this.contactIdentifiersElem.nativeElement,"display", "none")
        this.updateExecutionFlow(id)
      break;

      case "contactIdentifiersElement":
        console.log('reset contactIdentifiersElement')
        this.createFullIdentity.reset()
        this.renderer.setStyle(this.contactIdentifiersElement.nativeElement,"display", "none")
        this.updateExecutionFlow(id)
      break;

      case "getIdentifiersElement":
        console.log('reset getIdentifiersElement')
        this.createFullIdentity.reset()
        this.renderer.setStyle(this.getIdentifiersElement.nativeElement,"display", "none")
        this.updateExecutionFlow(id)
      break;
    }
  }

  //to be corrected
  updateExecutionFlow(id){
    console.log(`id is ${id}`)
    console.log(this.attachTrack)
    this.attachForms=this.attachForms.filter(elem=>elem.value!=id)
    const index=this.executionFlow.indexOf(id)
    this.executionFlow.splice(index,1)
    this.attachTrack.forEach(obj=>{
      console.log(obj.attach.nativeElement.id)
      if(obj.attach.nativeElement.id==id){
        console.log('attach exist!!!')
        this.line[parseInt(obj.link.split(':')[0])].remove()
        this.dettachTracks=this.dettachTracks.filter(elem=>elem!=obj.link)
        this.attachedNumber-=1
        this.dettachTracks.forEach(elem=>{
          elem=`${parseInt(elem.split(':')[0])-1}: ${elem.split(':')[1]}`
        })
        this.attachTrack.filter(obj=>obj.attach.nativeElement.id!=id)
      }
      if(obj.attached.nativeElement.id==id){
        console.log('attached exist!!!')
        const linIndex=parseInt(obj.link.split(':')[0])
        this.dettachedVal=obj.link
        this.line[linIndex].remove()
        this.dettachTracks=this.dettachTracks.filter(elem=>elem!=obj.link)
        this.attachedNumber-=1
      }
    })
    // this.attachTrack=this.attachTrack.filter(obj=>obj.source!=id)
    this.detach()
  }

  insertExecutionFlow(arg){
    arg.forEach(val=>{
      if(this.executionFlow.includes(val)==false){
        this.executionFlow.push(val)
      }
    })
  }

  //to be updated
  detach() {
    if (this.dettachedVal!=null && this.dettachedVal!=undefined ) {
      const index=parseInt(this.dettachedVal.split(':')[0])
      this.attachTrack=this.attachTrack.filter(elem=>elem.link!=this.dettachedVal)
      this.dettachTracks=this.dettachTracks.filter(elem=>elem!=this.dettachedVal)
      this.line[index].remove()
      this.updateIndex(index)
    }
  }

  updateIndex(index){
    for (let i = index-1; i < this.attachTrack.length; i++) {
      const info=this.attachTrack[i].link
      console.log(info.split(':')[1])
      this.attachTrack[i].link=`${i+1}:${info.split(':')[1]}`;
      this.dettachTracks[i]=`${i+1}:${info.split(':')[1]}`;
    }
    this.attachedNumber-=1
    if(this.attachTrack.length==0){
      this.detachState=false
    }
  }

  resultNavigation(){
    if(this.result!=null){
      this.dataSvc.update(this.result)
      return this.router.navigate(["../result"])
    }
  }

  //to be updated
  //logic:
  //run one forms in case of one forms is showed
  //button can't be clicked if many forms showed but no link is set
  //otherwise, if ther's link, execution order will be done as per indicated in the link one by one
  run(){
    this.runStatus=true
    //in case you have only one showed form

    if(this.executionFlow.length>1){
      this.attachTrack.forEach(obj=>{
        this.singleExecution(obj.source)
        .then(()=>{
          this.resultNavigation()
        })
        .catch(()=>{
          console.log('execution error!')
          return this.resultNavigation()
        })
      })
    }else if(this.executionFlow.length==1){
      this.singleExecution(this.executionFlow[0])
      .then(()=>{
        this.resultNavigation()
      })
      .catch(()=>{
        console.log('execution error!')
        return this.resultNavigation()
      })
    }else{
      console.log('runLogic execution!!!')
      return this.resultNavigation()
    }
  }

  singleExecution(val){
    console.log(val)
    return new Promise((resolve, reject)=>{
      switch (val) {
        case "createIdentityElement":
          console.log("createIdentityElement case")
          this.createNewUser(this.createFullIdentity).then(()=>{
            this.executionFlow.splice(this.executionFlow.indexOf(val),1)
            if(this.executionFlow.length>=1){
              this.patchData(val).then(()=>{
                return this.run()
              })
            }else{
              return resolve(true)
            }
          }).catch(()=>{
            return reject(false)
          })
          break;
        case "contactIdentifiersElement":
          console.log("contactIdentifiersElement case")
          this.contactIdentifiersFn(this.modifiedContactIdentifier).then(()=>{
            this.executionFlow.splice(this.executionFlow.indexOf(val),1)
            if(this.executionFlow.length>=1){
              this.patchData(val).then(()=>{
                return this.run()
              })
            }else{
              return resolve(true)
            }
          }).catch((error)=>{
            console.log(error)
            return reject(false)
          })
          break;
        case "getIdentifiersElement":
          console.log("getIdentifiersElement case")
          this.getIdentifierId(this.getIdentifier).then(()=>{
            this.executionFlow.splice(this.executionFlow.indexOf(val),1)
            if(this.executionFlow.length>=1){
              this.patchData(val).then(()=>{
                return this.run()
              })
            }else{
              return resolve(true)
            }
          }).catch(()=>{
            return reject(false)
          })
          break;
      }
    })
  }

  patchData(val){
    return new Promise((resolve, reject)=>{
      const links=this.attachTrack.filter(obj=>obj.source==val)
      this.attachTrack=this.attachTrack.filter(obj=>obj.source!=val)
      links.forEach(link=>{
        switch (link.attached.nativeElement.id) {
          case this.contactIdentifiersElement.nativeElement.id:
            console.log("modifiedContactIdentifier")
            this.modifiedContactIdentifier.get("value").patchValue(this.userIdentifier)
          break;
          case this.getIdentifiersElement.nativeElement.id:
            console.log("modifiedgetIdentifierr")
            this.getIdentifier.get("email").patchValue(this.createFullIdentity.get("contactIdentifiers").value[0]["value"])
          break;
        }
      })
      return resolve(true)
    })
  }

  ngOnDestroy(): void {
    this.createIdentityElementSbs.unsubscribe()
    this.line.forEach(elem=>elem.remove())
  }

}
